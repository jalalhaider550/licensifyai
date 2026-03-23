import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";

interface ClientLegalCaseWorkspaceProps {
  activeTab: string;
  selectedCase: any;
  selectedCaseId: string;
  caseOptions: any[];
  caseActions: any[];
  caseDocuments: any[];
  messages: any[];
  messageText: string;
  uploading: boolean;
  sendingAttachment: boolean;
  sendingMessage: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  onCaseChange: (caseId: string) => void;
  onOpenAttachment: (storagePath: string) => void;
  onRequestAttachmentUpload: () => void;
  onRequestDocumentUpload: () => void;
  onSendMessage: () => void;
  onTabChange: (value: string) => void;
  onMessageTextChange: (value: string) => void;
}

const getActionDestination = (actionType?: string) => {
  if (actionType === "upload_document") return "documents";
  if (actionType === "review_matter") return "summary";
  return "actions";
};

const getActionButtonLabel = (actionType?: string, fallback?: string) => {
  if (fallback) return fallback;
  if (actionType === "upload_document") return "Upload now";
  if (actionType === "review_matter") return "Review now";
  if (actionType === "draft_document") return "Open draft";
  if (actionType === "generate_strategy") return "View approach";
  return "Open";
};

export const ClientLegalCaseWorkspace = ({
  activeTab,
  selectedCase,
  selectedCaseId,
  caseOptions,
  caseActions,
  caseDocuments,
  messages,
  messageText,
  uploading,
  sendingAttachment,
  sendingMessage,
  messagesEndRef,
  onCaseChange,
  onOpenAttachment,
  onRequestAttachmentUpload,
  onRequestDocumentUpload,
  onSendMessage,
  onTabChange,
  onMessageTextChange,
}: ClientLegalCaseWorkspaceProps) => {
  if (!selectedCase) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="text-base font-semibold text-foreground">Legal Case Workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">No legal case is assigned to this client workspace yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Legal Case Workspace</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{selectedCase.title}</h2>
            <p className="text-sm text-muted-foreground">Contract, dispute, drafting, and case-action work stay separate from licensing.</p>
          </div>
          {caseOptions.length > 1 ? (
            <select
              value={selectedCaseId}
              onChange={(event) => onCaseChange(event.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {caseOptions.map((caseItem) => (
                <option key={caseItem.id} value={caseItem.id}>
                  {caseItem.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Current status</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedCase.status}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Open next steps</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{caseActions.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Shared documents</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{caseDocuments.length}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
          <TabsTrigger value="next-steps" className="text-xs">Next Steps</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
          <TabsTrigger value="messages" className="text-xs">Chat</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Case summary</h3>
              <p className="mt-2 text-sm leading-6 text-foreground">{selectedCase.client_summary || "Your legal team will share a summary here soon."}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="next-steps" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Next steps</h3>
            {caseActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client actions are required right now.</p>
            ) : (
              caseActions.map((action) => (
                <div key={action.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      {action.description ? <p className="mt-1 text-sm text-muted-foreground">{action.description}</p> : null}
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {action.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Documents</h3>
              <p className="mt-1 text-xs text-muted-foreground">Upload or review documents shared for this legal matter.</p>
            </div>
            <button
              type="button"
              onClick={onRequestDocumentUpload}
              className={`w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${uploading ? "pointer-events-none opacity-50" : "hover:border-primary/50 hover:bg-primary/5"}`}
            >
              {uploading ? (
                <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-foreground">{uploading ? "Uploading…" : "Upload legal documents"}</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF or Word documents</p>
            </button>

            {caseDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents have been shared for this case yet.</p>
            ) : (
              <div className="space-y-2">
                {caseDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-foreground">{doc.name}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {doc.ai_status === "processed" ? "Processed" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <div className="rounded-xl border border-border bg-card flex flex-col" style={{ height: "400px" }}>
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Case chat</h3>
              <p className="text-xs text-muted-foreground">Message your legal team inside this case.</p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No messages yet. Start the conversation here.</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.sender_type === "client" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <p>{msg.message}</p>
                      {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((attachment: any, index: number) => (
                            <button
                              key={`${msg.id}-${index}`}
                              type="button"
                              onClick={() => onOpenAttachment(attachment.storage_path)}
                              className="block text-left text-xs underline underline-offset-2"
                            >
                              {attachment.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <p className={`mt-1 text-[10px] ${msg.sender_type === "client" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={onRequestAttachmentUpload} disabled={sendingAttachment}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(event) => onMessageTextChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSendMessage();
                  }
                }}
              />
              <Button size="sm" onClick={onSendMessage} disabled={sendingMessage || !messageText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Action center</h3>
            {caseActions.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                Your legal team has not assigned any client actions yet.
              </div>
            ) : (
              caseActions.map((action) => (
                <div key={action.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                      {action.action_type === "upload_document" ? <Upload className="h-4 w-4" /> : action.action_type === "review_matter" ? <AlertCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      {action.description ? <p className="mt-1 text-sm text-muted-foreground">{action.description}</p> : null}
                      <div className="mt-3">
                        <Button size="sm" onClick={() => onTabChange(getActionDestination(action.action_type))}>
                          {getActionButtonLabel(action.action_type, action.actionLabel)}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};