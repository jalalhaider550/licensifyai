export type CaseInfoRequestStatus = "requested" | "pending" | "received";

export const getCaseInfoRequestStatusClasses = (status?: string | null) => {
  switch (status) {
    case "received":
      return "border-primary/20 bg-primary/10 text-primary";
    case "pending":
      return "border-warning/20 bg-warning/10 text-warning";
    case "requested":
    default:
      return "border-secondary bg-secondary text-secondary-foreground";
  }
};

export const getCaseInfoRequestStatusLabel = (status?: string | null) => {
  switch (status) {
    case "received":
      return "Received";
    case "pending":
      return "Pending";
    case "requested":
    default:
      return "Requested from client";
  }
};

export const buildCaseInfoRequestLink = (token: string) => `${window.location.origin}/client-request?token=${token}`;

export const buildCaseInfoRequestMessage = ({
  link,
  requestTitle,
  companyName,
}: {
  link: string;
  requestTitle: string;
  companyName?: string | null;
}) => {
  const greeting = companyName ? `Hello ${companyName},` : "Hello,";

  return `${greeting}\n\nPlease provide the requested documents using the link below:\n\n${requestTitle}\n${link}\n\nYou can upload files, add any requested information, and leave notes in the form.\n\nThank you.`;
};
