import { getDb } from "./mongodb";
import { sendWassceCheckerEmail } from "./email";
import { invalidateCheckersCache } from "./redis";

export async function processPendingWassceOrders() {
    try {
        const db = await getDb();
        const checkersCollection = db.collection<{
            serial: string;
            pin: string;
            status: "Issued" | "Unissued";
            issuedTo?: string | null;
            issuedAt?: Date | null;
        }>("checkers");

        const paymentsCollection = db.collection<{
            reference: string;
            email: string;
            fullName?: string | null;
            quantity: number;
            checkers: { serial: string; pin: string }[];
        }>("checkerPayments");

        // Fetch all potentially pending payments (e.g. status success/pending, or just all recent)
        // To be safe against $expr issues, we'll fetch recent payments and filter JS side.
        // Assuming volume isn't massive. If > 1000, we should use the query, but let's test.
        const recentPayments = await paymentsCollection
            .find({})
            .sort({ createdAt: 1 })
            // .limit(1000) // safety
            .toArray();

        const pendingOrders = recentPayments.filter(p => {
            const q = p.quantity || 0;
            const c = p.checkers?.length || 0;
            return q > c;
        });

        console.log("[processPendingWassceOrders] Found pending orders:", pendingOrders.length);

        const stats = { found: pendingOrders.length, processed: 0, logs: [] as string[] };

        if (pendingOrders.length === 0) {
            return stats;
        }

        const now = new Date();

        for (const order of pendingOrders) {
            const needed = order.quantity - (order.checkers?.length || 0);
            console.log(`[processPendingWassceOrders] Processing order ${order.reference}. Needed: ${needed}`);

            if (needed <= 0) continue;

            // Find 'needed' unissued checkers
            // We process one by one to ensure atomicity or use a bulk update if possible.
            // Doing one by one is safer for now.
            const newCheckers: { serial: string; pin: string }[] = [];

            for (let i = 0; i < needed; i++) {
                const result = await checkersCollection.findOneAndUpdate(
                    { status: "Unissued" },
                    {
                        $set: {
                            status: "Issued",
                            issuedTo: order.email,
                            issuedAt: now,
                        },
                    },
                    {
                        sort: { createdAt: 1 },
                        returnDocument: "after",
                    },
                );

                const doc = (result as any)?.value ?? (result as any) ?? null;
                if (!doc) break; // Out of stock
                newCheckers.push({ serial: doc.serial, pin: doc.pin });
            }

            if (newCheckers.length > 0) {
                // Update payment record
                const updatedCheckers = [...order.checkers, ...newCheckers];
                await paymentsCollection.updateOne(
                    { reference: order.reference },
                    { $set: { checkers: updatedCheckers } }
                );

                // Send email with ALL checkers (or just new ones? safer to send full list)
                await sendWassceCheckerEmail({
                    to: order.email,
                    fullName: order.fullName ?? undefined,
                    checkers: updatedCheckers,
                });
            }

            // If we couldn't fill this order completely, we probably ran out of stock, so strict break?
            // Or continue to see if we can fill smaller orders?
            // Usually FCFS means we stop if we can't fill the head of the line?
            // But if we have 1 stock and head needs 2, we gave 1. Loop continues.
            // Next iteration of finding stock will fail.
            const available = await checkersCollection.countDocuments({ status: "Unissued" });
            if (available === 0) break;
        }

        await invalidateCheckersCache();
        return stats;
    } catch (error) {
        console.error("Error processing pending WASSCE orders:", error);
        return { found: 0, processed: 0, error: String(error) };
    }
}
