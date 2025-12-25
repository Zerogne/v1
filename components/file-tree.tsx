"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FileNode {
  path: string
  name: string
  children?: FileNode[]
}

interface FileNodeBuilder {
  path: string
  name: string
  children?: Record<string, FileNodeBuilder>
}

interface FileTreeProps {
  files: Array<{ path: string; name?: string }>
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onNewFile?: () => void
}

function buildTree(files: Array<{ path: string }>): FileNode[] {
  const tree: Record<string, FileNodeBuilder> = {}

  files.forEach((file) => {
    const parts = file.path.split("/")
    let current = tree

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          path: parts.slice(0, index + 1).join("/"),
          name: part,
          children: {},
        }
      }
      if (index < parts.length - 1) {
        if (!current[part].children) {
          current[part].children = {}
        }
        current = current[part].children!
      }
    })
  })

  const convertToArray = (obj: Record<string, FileNodeBuilder>): FileNode[] => {
    return Object.values(obj).map((node) => ({
      path: node.path,
      name: node.name,
      children: node.children
        ? convertToArray(node.children)
        : undefined,
    }))
  }

  return convertToArray(tree)
}

function TreeNode({
  node,
  selectedPath,
  onSelectFile,
  level = 0,
}: {
  node: FileNode
  selectedPath: string | null
  onSelectFile: (path: string) => void
  level?: number
}) {
  const [isOpen, setIsOpen] = useState(level < 2)
  const isFile = !node.children || node.children.length === 0
  const isSelected = selectedPath === node.path

  if (isFile) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-secondary rounded-md transition-colors",
          isSelected && "bg-secondary font-medium"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelectFile(node.path)}
      >
        <File className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-foreground">{node.name}</span>
      </div>
    )
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-secondary rounded-md transition-colors",
          isSelected && "bg-secondary"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {isOpen ? (
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-foreground">{node.name}</span>
      </div>
      {isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, selectedPath, onSelectFile, onNewFile }: FileTreeProps) {
  const tree = buildTree(files.map((f) => ({ path: f.path })))

  return (
    <div className="h-full flex flex-col bg-card">
      {onNewFile && (
        <div className="p-4 border-b border-border/40">
          <button
            onClick={onNewFile}
            className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-md hover:bg-secondary transition-colors text-foreground"
          >
            + New File
          </button>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {tree.length === 0 ? (
            <div className="text-xs text-muted-foreground px-3 py-4 text-center">
              No files yet
            </div>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

