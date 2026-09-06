import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EXTERNAL_SETUP_SQL } from "@/lib/external-db-sql";
import { resetDbTarget } from "@/lib/gallery";
import {
  getExternalDbStatus,
  migrateToExternalDb,
  provisionExternalDb,
  saveExternalDb,
  setExternalDbActive,
} from "@/lib/external-db.functions";

export function ExternalDbPanel({ onSwitched }: { onSwitched: () => void }) {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["external-db-status"],
    queryFn: () => getExternalDbStatus(),
  });

  const save = useServerFn(saveExternalDb);
  const provision = useServerFn(provisionExternalDb);
  const migrate = useServerFn(migrateToExternalDb);
  const activate = useServerFn(setExternalDbActive);

  const [url, setUrl] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    if (!status.data) return;
    setUrl(status.data.url);
    setPublishableKey(status.data.publishableKey);
  }, [status.data]);

  const refresh = () => {
    resetDbTarget();
    void queryClient.invalidateQueries({ queryKey: ["external-db-status"] });
    onSwitched();
  };

  const saveDetails = useMutation({
    mutationFn: () =>
      save({
        data: {
          url,
          publishableKey,
          ...(serviceKey ? { serviceKey } : {}),
        },
      }),
    onSuccess: () => {
      setServiceKey("");
      toast.success("Connected — your database answered.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setUp = useMutation({
    mutationFn: () => provision(),
    onSuccess: (result) => {
      if (result.missing.length) {
        setShowSql(true);
        toast.warning(
          `Still missing: ${result.missing.join(", ")}. Run the setup text below in your database once.`,
        );
      } else {
        toast.success(
          `Ready. Photo folder ${result.bucket === "created" ? "created" : "already there"}.`,
        );
      }
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copyOver = useMutation({
    mutationFn: () => migrate(),
    onSuccess: (result) => {
      toast.success(
        `Copied ${result.artworks} pieces, ${result.content} texts and ${result.photos} photos.` +
          (result.failed.length ? ` ${result.failed.length} photos failed.` : ""),
      );
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: (active: boolean) => activate({ data: { active } }),
    onSuccess: (result) => {
      toast.success(
        result.active
          ? "The website is now using your database."
          : "Back on the built-in database.",
      );
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = status.data;
  const busy =
    saveDetails.isPending ||
    setUp.isPending ||
    copyOver.isPending ||
    toggle.isPending;

  return (
    <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        My database
      </h2>
      <p className="mt-2 max-w-prose text-sm text-ink/60">
        Move your artworks, site text and photos into a database you own. The
        built-in copy stays untouched, so you can switch back any time. Signing
        in to this panel always stays here.
      </p>

      <div className="mt-4 rounded-xl bg-paper p-4 text-sm ring-1 ring-black/5">
        <p>
          <span className="text-ink/60">Live now:</span>{" "}
          <strong>
            {data?.active ? "your own database" : "the built-in database"}
          </strong>
        </p>
        {data?.remote && (
          <p className="mt-1 text-ink/60">
            Your database holds {data.remote.artworks} pieces and{" "}
            {data.remote.content} texts.
          </p>
        )}
        {data?.last4 && (
          <p className="mt-1 text-ink/60">
            Secret key saved, ending ••••{data.last4}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="db-url">Database address</Label>
          <Input
            id="db-url"
            placeholder="https://yourproject.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="db-pub">Public key</Label>
          <Input
            id="db-pub"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="db-secret">
            Secret key {data?.last4 ? "(leave blank to keep the saved one)" : ""}
          </Label>
          <Input
            id="db-secret"
            type="password"
            autoComplete="off"
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy || !url || !publishableKey}
            onClick={() => saveDetails.mutate()}
          >
            {saveDetails.isPending ? "Testing…" : "Save & test connection"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !data?.configured}
            onClick={() => setUp.mutate()}
          >
            {setUp.isPending ? "Setting up…" : "Set up my database"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !data?.configured}
            onClick={() => copyOver.mutate()}
          >
            {copyOver.isPending ? "Copying…" : "Copy everything over"}
          </Button>
        </div>

        <div className="mt-2 flex items-center gap-3 rounded-xl bg-paper p-4 ring-1 ring-black/5">
          <Switch
            id="use-mine"
            checked={Boolean(data?.active)}
            disabled={busy || !data?.configured}
            onCheckedChange={(checked) => toggle.mutate(checked)}
          />
          <Label htmlFor="use-mine">Use my database for the live site</Label>
        </div>

        <div>
          <button
            type="button"
            className="text-sm text-sun hover:underline"
            onClick={() => setShowSql((v) => !v)}
          >
            {showSql ? "Hide" : "Show"} the one-time setup text
          </button>
          {showSql && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-ink/60">
                Paste this into your database provider's SQL editor and run it
                once. It creates the tables and access rules the gallery needs.
              </p>
              <Textarea
                readOnly
                rows={10}
                value={EXTERNAL_SETUP_SQL}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(EXTERNAL_SETUP_SQL);
                  toast.success("Setup text copied.");
                }}
              >
                Copy setup text
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
