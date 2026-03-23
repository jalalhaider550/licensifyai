export interface PreparedDownload {
  url: string;
  fileName: string;
  mimeType: string;
}

export const prepareBrowserDownload = (blob: Blob, fileName: string, mimeType: string): PreparedDownload => {
  const normalizedBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
  const url = URL.createObjectURL(normalizedBlob);

  return {
    url,
    fileName,
    mimeType,
  };
};

export const triggerBrowserDownload = ({ url, fileName, mimeType }: PreparedDownload) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  anchor.setAttribute("data-download-mime", mimeType);

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export const revokeBrowserDownload = (url?: string | null) => {
  if (!url) return;
  URL.revokeObjectURL(url);
};