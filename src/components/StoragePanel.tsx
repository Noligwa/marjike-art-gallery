import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getStorageSettings,
  saveStorageSettings,
  uploadToCpanel,
  type StorageSettings,
} from "@/lib/gallery-writes";

function phpScript(key: string) {
  return `<?php
// Marjike gallery upload script — save as upload.php on your web hosting.
$KEY = '${key.replace(/'/g, "\\'") || "CHANGE-ME"}';
$DIR = __DIR__ . '/uploads';
$ALLOWED = ['jpg','jpeg','png','webp','gif','mp4','webm','mov','txt'];

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-Upload-Key, Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$given = $_SERVER['HTTP_X_UPLOAD_KEY'] ?? '';
if (!hash_equals($KEY, $given)) { http_response_code(401); echo json_encode(['error' => 'Wrong upload key']); exit; }
if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['error' => 'No file received (check upload_max_filesize)']); exit; }

$path = preg_replace('#[^a-zA-Z0-9/_\\.-]#', '', $_POST['path'] ?? basename($_FILES['file']['name']));
$path = trim(str_replace('..', '', $path), '/');
$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
if (!in_array($ext, $ALLOWED, true)) { http_response_code(400); echo json_encode(['error' => 'File type not allowed']); exit; }

$target = $DIR . '/' . $path;
if (!is_dir(dirname($target))) { mkdir(dirname($target), 0755, true); }
if (!move_uploaded_file($_FILES['file']['tmp_name'], $target)) { http_response_code(500); echo json_encode(['error' => 'Could not save file — check folder permissions']); exit; }

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $scheme . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
echo json_encode(['url' => $base . '/uploads/' . $path]);
`;
}

function randomKey() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function StoragePanel() {
  const [s, setS] = useState<StorageSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getStorageSettings()
      .then((v) => setS(v.key ? v : { ...v, key: randomKey() }))
      .catch(() => setS({ provider: "cloud", uploadUrl: "", publicUrl: "", key: randomKey() }));
  }, []);

  if (!s) return null;
  const set = (patch: Partial<StorageSettings>) => setS({ ...s, ...patch });

  async function save() {
    setBusy(true);
    try {
      await saveStorageSettings(s!);
      toast.success("Storage choice saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const url = await uploadToCpanel(
        s!,
        new Blob(["ok"], { type: "text/plain" }),
        `test/connection-${Date.now()}.txt`,
      );
      toast.success(`Web hosting works — test file at ${url}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="font-display text-2xl">Where photos & videos are stored</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        New uploads go to the place you choose here. Pieces already uploaded keep
        working wherever they are.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant={s.provider === "cloud" ? "default" : "outline"}
          onClick={() => set({ provider: "cloud" })}
        >
          Built-in cloud storage
        </Button>
        <Button
          variant={s.provider === "cpanel" ? "default" : "outline"}
          onClick={() => set({ provider: "cpanel" })}
        >
          My web hosting (cPanel)
        </Button>
      </div>

      {s.provider === "cpanel" && (
        <div className="mt-6 grid max-w-2xl gap-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>In cPanel open File Manager → public_html and create a folder, e.g. <code>gallery</code>.</li>
            <li>Inside it create a file <code>upload.php</code> and paste the script below.</li>
            <li>Enter its address below (e.g. https://yourdomain.com/gallery/upload.php), save, then test.</li>
          </ol>
          <div className="grid gap-2">
            <Label htmlFor="cp-url">Upload script address</Label>
            <Input
              id="cp-url"
              placeholder="https://yourdomain.com/gallery/upload.php"
              value={s.uploadUrl}
              onChange={(e) => set({ uploadUrl: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cp-pub">Public files address (optional)</Label>
            <Input
              id="cp-pub"
              placeholder="https://yourdomain.com/gallery/uploads"
              value={s.publicUrl}
              onChange={(e) => set({ publicUrl: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cp-key">Upload key (must match the script)</Label>
            <div className="flex gap-2">
              <Input id="cp-key" value={s.key} onChange={(e) => set({ key: e.target.value })} />
              <Button variant="outline" onClick={() => set({ key: randomKey() })}>
                New key
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>upload.php script</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(phpScript(s.key));
                  toast.success("Script copied");
                }}
              >
                Copy script
              </Button>
            </div>
            <Textarea readOnly rows={10} className="font-mono text-xs" value={phpScript(s.key)} />
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button onClick={save} disabled={busy}>Save storage choice</Button>
        {s.provider === "cpanel" && (
          <Button variant="outline" onClick={test} disabled={busy || !s.uploadUrl}>
            Test web hosting
          </Button>
        )}
      </div>
    </section>
  );
}
