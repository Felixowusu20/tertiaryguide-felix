"use client"

import { useEffect } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Link } from "@tiptap/extension-link"
import { Underline } from "@tiptap/extension-underline"
import { Selection } from "@tiptap/extensions"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- UI Primitives ---
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover"
import { LinkPopover } from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

interface BlogEditorProps {
    value: string
    onChange: (html: string) => void
}

export function BlogEditor({ value, onChange }: BlogEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "simple-editor min-h-[250px] p-4 focus:outline-none prose prose-sm max-w-none",
            },
        },
        extensions: [
            StarterKit.configure({
                horizontalRule: false,
            }),
            Link.configure({
                openOnClick: false,
                enableClickSelection: true,
            }),
            HorizontalRule,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Highlight.configure({ multicolor: true }),
            Typography,
            Superscript,
            Subscript,
            Underline,
            Selection,
            Image,
            ImageUploadNode.configure({
                accept: "image/*",
                maxSize: MAX_FILE_SIZE,
                limit: 3,
                upload: handleImageUpload,
                onError: (error) => console.error("Upload failed:", error),
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Sync external value changes (e.g., when editing a post)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, { emitUpdate: false })
        }
    }, [value, editor])

    return (
        <div className="blog-editor-wrapper rounded-xl border border-gray-200 overflow-hidden bg-white">
            <EditorContext.Provider value={{ editor }}>
                <Toolbar className="border-b border-gray-200 bg-gray-50 flex-wrap">
                    <ToolbarGroup>
                        <UndoRedoButton action="undo" />
                        <UndoRedoButton action="redo" />
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
                        <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
                        <BlockquoteButton />
                        <CodeBlockButton />
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <MarkButton type="bold" />
                        <MarkButton type="italic" />
                        <MarkButton type="strike" />
                        <MarkButton type="code" />
                        <MarkButton type="underline" />
                        <MarkButton type="superscript" />
                        <MarkButton type="subscript" />
                        <ColorHighlightPopover />
                        <LinkPopover />
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <TextAlignButton align="left" />
                        <TextAlignButton align="center" />
                        <TextAlignButton align="right" />
                        <TextAlignButton align="justify" />
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <ImageUploadButton text="Image" />
                    </ToolbarGroup>

                    <Spacer />
                </Toolbar>

                <EditorContent
                    editor={editor}
                    className="simple-editor-content"
                />
            </EditorContext.Provider>
        </div>
    )
}
