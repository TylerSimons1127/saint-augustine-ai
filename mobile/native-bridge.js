import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { StatusBar, Style } from "@capacitor/status-bar";

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add("capacitor-native");

  StatusBar.setStyle({ style: Style.Light }).catch(() => {});

  if (typeof navigator.share !== "function") {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (payload = {}) => Share.share({
        title: payload.title || "Saint Augustine AI",
        text: payload.text || "",
        url: payload.url,
      }),
    });
  }

  const cleanFilename = (value) => String(value || "saint-augustine-ai-export.txt")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .slice(0, 120);

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read the export."));
    reader.onload = () => resolve(String(reader.result || "").split(",", 2)[1] || "");
    reader.readAsDataURL(blob);
  });

  async function shareDownloadedFile(anchor) {
    try {
      const response = await fetch(anchor.href);
      if (!response.ok) throw new Error("Could not read the exported file.");
      const data = await blobToBase64(await response.blob());
      const filename = cleanFilename(anchor.download);
      await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title: filename, files: [uri] });
      window.__saToast?.("Export ready to save or share.");
    } catch (error) {
      console.error("Native file sharing failed", error);
      window.__saToast?.("Could not prepare that file for sharing.", { kind: "error" });
    }
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[download]") : null;
    if (!anchor || !anchor.href.startsWith("blob:")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void shareDownloadedFile(anchor);
  }, true);

  document.addEventListener("click", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor || event.defaultPrevented) return;

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }

    const isAboutPage = url.origin === window.location.origin && /\/landing\.html$/i.test(url.pathname);
    const isWebLink = url.protocol === "https:" || url.protocol === "http:";
    const isExternal = isWebLink && url.origin !== window.location.origin;
    if (!isAboutPage && !isExternal) return;

    event.preventDefault();
    event.stopPropagation();
    const target = isAboutPage ? "https://staugustineai.vercel.app/landing" : url.href;
    Browser.open({ url: target, presentationStyle: "fullscreen", toolbarColor: "#f6f2eb" })
      .catch((error) => {
        console.error("Could not open the linked page", error);
        window.__saToast?.("Could not open that link.", { kind: "error" });
      });
  }, true);
}
