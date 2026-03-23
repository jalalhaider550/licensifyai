import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Upload,
  Users,
} from "lucide-react";

interface ClientLicensingWorkspaceProps {
  activeTab: string;
  caseOptions: any[];
  clientDocuments: any[];
  companyForm: {
    company_name: string;
    registration_number: string;
    registered_address: string;
    contact_email: string;
    contact_phone: string;
    services: string[];
    business_description: string;
  };
  messages: any[];
  missingItems: string[];
  newDirector: { full_name: string; role: string };
  newShareholder: { name: string; percentage: number };
  progress: number;
  saving: boolean;
  selectedCaseId: string;
  sendingAttachment: boolean;
  sendingMessage: boolean;
  uploading: boolean;
  visibleCaseDocuments: any[];
  messagesEndRef: RefObject<HTMLDivElement>;
  messageText: string;
  people: {
    directors: any[];
    shareholders: any[];
  };
  onAddDirector: () => void;
  onAddShareholder: () => void;
  onCaseChange: (caseId: string) => void;
  onCompanyFormChange: (value: ClientLicensingWorkspaceProps["companyForm"]) => void;
  onMessageTextChange: (value: string) => void;
  onNewDirectorChange: (value: ClientLicensingWorkspaceProps["newDirector"]) => void;
  onNewShareholderChange: (value: ClientLicensingWorkspaceProps["newShareholder"]) => void;
  onOpenAttachment: (storagePath: string) => void;
  onRequestAttachmentUpload: () => void;
  onRequestDocumentUpload: () => void;
  onSaveCompanyInfo: () => void;
  onSendMessage: () => void;
  onTabChange: (value: string) => void;
}

export const ClientLicensingWorkspace = ({
  activeTab,
  caseOptions,
  clientDocuments,
  companyForm,
  messages,
  missingItems,
  newDirector,
  newShareholder,
  progress,
  saving,
  selectedCaseId,
  sendingAttachment,
  sendingMessage,
  uploading,
  visibleCaseDocuments,
  messagesEndRef,
  messageText,
  people,
  onAddDirector,
  onAddShareholder,
  onCaseChange,
  onCompanyFormChange,
  onMessageTextChange,
  onNewDirectorChange,
  onNewShareholderChange,
  onOpenAttachment,
  onRequestAttachmentUpload,
  onRequestDocumentUpload,
  onSaveCompanyInfo,
  onSendMessage,
  onTabChange,
}: ClientLicensingWorkspaceProps) => {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Licensing Workspace</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">Data Collection Progress</h2>
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
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Licensing readiness</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        {missingItems.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">What's still needed:</p>
            {missingItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-warning-foreground">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-success-foreground">
            <CheckCircle2 className="h-4 w-4" />
            All required information has been provided.
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="text-xs"><Building2 className="mr-1 h-3 w-3" /> Company</TabsTrigger>
          <TabsTrigger value="people" className="text-xs"><Users className="mr-1 h-3 w-3" /> People</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs"><FileText className="mr-1 h-3 w-3" /> Documents</TabsTrigger>
          <TabsTrigger value="messages" className="text-xs"><MessageSquare className="mr-1 h-3 w-3" /> Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Company Name</Label>
                <Input value={companyForm.company_name} onChange={(event) => onCompanyFormChange({ ...companyForm, company_name: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registration Number</Label>
                <Input value={companyForm.registration_number} onChange={(event) => onCompanyFormChange({ ...companyForm, registration_number: event.target.value })} placeholder="e.g. 12345678" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Registered Address</Label>
                <Input value={companyForm.registered_address} onChange={(event) => onCompanyFormChange({ ...companyForm, registered_address: event.target.value })} placeholder="Full registered address" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Email</Label>
                <Input type="email" value={companyForm.contact_email} onChange={(event) => onCompanyFormChange({ ...companyForm, contact_email: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Phone</Label>
                <Input value={companyForm.contact_phone} onChange={(event) => onCompanyFormChange({ ...companyForm, contact_phone: event.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Services / Business Description</Label>
                <Textarea
                  value={companyForm.business_description}
                  onChange={(event) => onCompanyFormChange({ ...companyForm, business_description: event.target.value })}
                  placeholder="Describe your fintech services, business model, and target market..."
                  rows={4}
                />
              </div>
            </div>
            <Button onClick={onSaveCompanyInfo} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Save Company Information
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="people" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Directors</h3>
            {people.directors.length > 0 ? (
              <div className="space-y-2">
                {people.directors.map((director) => (
                  <div key={director.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{director.full_name}</span>
                      <span className="ml-2 text-muted-foreground">({director.role})</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input placeholder="Director name" value={newDirector.full_name} onChange={(event) => onNewDirectorChange({ ...newDirector, full_name: event.target.value })} className="flex-1" />
              <Input placeholder="Role" value={newDirector.role} onChange={(event) => onNewDirectorChange({ ...newDirector, role: event.target.value })} className="w-32" />
              <Button size="sm" onClick={onAddDirector} disabled={!newDirector.full_name.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Shareholders</h3>
            {people.shareholders.length > 0 ? (
              <div className="space-y-2">
                {people.shareholders.map((shareholder) => (
                  <div key={shareholder.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{shareholder.name}</span>
                      <span className="ml-2 text-muted-foreground">({shareholder.percentage}%)</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input placeholder="Shareholder name" value={newShareholder.name} onChange={(event) => onNewShareholderChange({ ...newShareholder, name: event.target.value })} className="flex-1" />
              <Input type="number" placeholder="%" value={newShareholder.percentage || ""} onChange={(event) => onNewShareholderChange({ ...newShareholder, percentage: Number(event.target.value) })} className="w-20" />
              <Button size="sm" onClick={onAddShareholder} disabled={!newShareholder.name.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Upload Documents</h3>
            <p className="text-xs text-muted-foreground">Upload passports, company documents, and business plans. Accepted formats: PDF, Word.</p>
            <button
              type="button"
              onClick={onRequestDocumentUpload}
              className={`w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${uploading ? "pointer-events-none opacity-50" : "hover:border-primary/50 hover:bg-primary/5"}`}
            >
              {uploading ? <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" /> : <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />}
              <p className="text-sm font-medium text-foreground">{uploading ? "Uploading..." : "Click to upload or drag & drop"}</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF or Word documents</p>
            </button>

            {visibleCaseDocuments.length > 0 || clientDocuments.length > 0 ? (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-medium text-muted-foreground">Uploaded Documents</h4>
                {[...visibleCaseDocuments, ...(selectedCaseId ? [] : clientDocuments)].map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-foreground">{doc.name}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {doc.ai_status === "processed" ? "Processed" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card flex flex-col" style={{ height: "400px" }}>
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Messages</h3>
              <p className="text-xs text-muted-foreground">Communicate with your licensing team</p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No messages yet. Send a message to your legal team.</p> : null}
              {messages.map((msg) => (
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
              ))}
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
      </Tabs>
    </div>
  );
};