import "./Mailbox.css";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  RefreshCw,
  Check,
  X,
  Trash2,
  FileText,
  Copy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  ICON_SM,
  ICON_MD,
  STROKE,
} from "@/lib/icons";
import {
  getMailbox,
  claimMailbox,
  getReceivedInvoices,
  approveReceivedInvoice,
  rejectReceivedInvoice,
  deleteReceivedInvoice,
  attachmentUrl,
  money,
  type MailboxInfo,
  type ReceivedInvoice,
} from "../utils/storage";

interface MailboxProps {
  lang: string;
  t: Record<string, string>;
  user: { email: string } | null;
}

function calcTotal(parsed: any): number {
  const items = parsed?.items || [];
  return items.reduce((sum: number, it: any) => {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    const tax = Number(it.taxRate) || 0;
    return sum + qty * price * (1 + tax / 100);
  }, 0);
}

export default function Mailbox({ lang, user }: MailboxProps) {
  const isCz = lang === "cs";
  const [loading, setLoading] = useState(true);
  const [mailbox, setMailbox] = useState<MailboxInfo | null>(null);
  const [domain, setDomain] = useState("fakturidias.app");
  const [slugInput, setSlugInput] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [copied, setCopied] = useState(false);

  const [received, setReceived] = useState<ReceivedInvoice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => received.find((r) => r.id === selectedId) || null,
    [received, selectedId],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const info = await getMailbox();
      setMailbox(info.mailbox);
      setDomain(info.domain);
      if (info.mailbox) {
        const list = await getReceivedInvoices();
        setReceived(list);
        setSelectedId((prev) => prev || list[0]?.id || null);
      }
    } catch {
      /* surfaced via empty state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadAll();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep an editable copy of the selected bill's parsed fields.
  useEffect(() => {
    setDraft(
      selected?.parsed ? JSON.parse(JSON.stringify(selected.parsed)) : null,
    );
  }, [selectedId, selected?.parseStatus]);

  const handleClaim = async () => {
    setClaimError("");
    setClaiming(true);
    try {
      const res = await claimMailbox(slugInput);
      setMailbox(res.mailbox);
      setDomain(res.domain);
      await loadAll();
    } catch (err: any) {
      setClaimError(
        err?.message || (isCz ? "Nepodařilo se uložit" : "Failed to save"),
      );
    } finally {
      setClaiming(false);
    }
  };

  const copyAddress = () => {
    if (!mailbox) return;
    navigator.clipboard?.writeText(mailbox.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const setField = (key: string, value: any) =>
    setDraft((d: any) => ({ ...(d || {}), [key]: value }));

  const setItemField = (idx: number, key: string, value: any) =>
    setDraft((d: any) => {
      const items = [...(d?.items || [])];
      items[idx] = { ...items[idx], [key]: value };
      return { ...d, items };
    });

  const handleApprove = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await approveReceivedInvoice(selected.id, draft);
      setReceived((list) =>
        list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await rejectReceivedInvoice(selected.id);
      setReceived((list) =>
        list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(isCz ? "Smazat tuto položku?" : "Delete this item?"))
      return;
    setBusy(true);
    try {
      await deleteReceivedInvoice(selected.id);
      setReceived((list) => {
        const next = list.filter((r) => r.id !== selected.id);
        setSelectedId(next[0]?.id || null);
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="mbx-wrap">
        <div className="mbx-empty card">
          <Mail size={32} strokeWidth={1.5} />
          <h2>{isCz ? "Schránka faktur" : "Invoice mailbox"}</h2>
          <p>
            {isCz
              ? "Pro vytvoření e-mailové schránky se prosím přihlaste."
              : "Please sign in to create your invoice mailbox."}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mbx-wrap">
        <div className="mbx-empty card">
          <Loader2 size={28} className="mbx-spin" />
          <p>{isCz ? "Načítání…" : "Loading…"}</p>
        </div>
      </div>
    );
  }

  // ── Mailbox setup ──────────────────────────────────────────────────────────
  if (!mailbox) {
    return (
      <div className="mbx-wrap">
        <div className="mbx-setup card">
          <div className="mbx-setup__icon">
            <Mail size={28} strokeWidth={1.5} />
          </div>
          <h2>
            {isCz
              ? "Vytvořte si schránku faktur"
              : "Create your invoice mailbox"}
          </h2>
          <p className="mbx-setup__lead">
            {isCz
              ? "Získejte vlastní e-mailovou adresu. Faktury, které na ni přijdou, automaticky načteme a připravíme ke schválení."
              : "Get a dedicated email address. Invoices sent there are auto-parsed and queued for your approval."}
          </p>
          <label className="mbx-setup__label">
            {isCz ? "Název schránky" : "Mailbox name"}
          </label>
          <div className="mbx-setup__row">
            <input
              className="mbx-setup__input"
              value={slugInput}
              placeholder={isCz ? "napr-mojefirma" : "e-g-mycompany"}
              onChange={(e) => setSlugInput(e.target.value)}
              autoFocus
            />
            <span className="mbx-setup__suffix">@{domain}</span>
          </div>
          {claimError && (
            <p className="mbx-setup__error">
              <AlertTriangle size={ICON_SM} /> {claimError}
            </p>
          )}
          <button
            className="mbx-btn mbx-btn--primary mbx-setup__btn"
            onClick={handleClaim}
            disabled={claiming || slugInput.trim().length < 3}
          >
            {claiming ? (
              <Loader2 size={ICON_SM} className="mbx-spin" />
            ) : (
              <Check size={ICON_SM} strokeWidth={STROKE} />
            )}
            {isCz ? "Vytvořit schránku" : "Create mailbox"}
          </button>
        </div>
      </div>
    );
  }

  // ── Mailbox + inbox ────────────────────────────────────────────────────────
  return (
    <div className="mbx-wrap">
      <div className="mbx-head card">
        <div className="mbx-head__left">
          <div className="mbx-head__icon">
            <Mail size={ICON_MD} strokeWidth={STROKE} />
          </div>
          <div>
            <div className="mbx-head__label">
              {isCz ? "Vaše schránka faktur" : "Your invoice mailbox"}
            </div>
            <button
              className="mbx-address"
              onClick={copyAddress}
              title={isCz ? "Kopírovat" : "Copy"}
            >
              {mailbox.address}
              {copied ? (
                <Check size={ICON_SM} strokeWidth={STROKE} />
              ) : (
                <Copy size={ICON_SM} strokeWidth={STROKE} />
              )}
            </button>
          </div>
        </div>
        <button className="mbx-btn mbx-btn--ghost" onClick={loadAll}>
          <RefreshCw size={ICON_SM} strokeWidth={STROKE} />
          {isCz ? "Obnovit" : "Refresh"}
        </button>
      </div>

      <div className="mbx-grid">
        {/* List */}
        <div className="mbx-list card">
          {received.length === 0 ? (
            <div className="mbx-list__empty">
              <Clock size={22} strokeWidth={1.5} />
              <p>{isCz ? "Zatím žádné faktury" : "No invoices yet"}</p>
              <span>
                {isCz
                  ? "Přeposlané faktury se objeví zde."
                  : "Forwarded invoices will appear here."}
              </span>
            </div>
          ) : (
            received.map((r) => (
              <button
                key={r.id}
                className={`mbx-item${r.id === selectedId ? " mbx-item--active" : ""}`}
                onClick={() => setSelectedId(r.id)}
              >
                <div className="mbx-item__top">
                  <span className="mbx-item__from">
                    {r.fromName ||
                      r.from ||
                      (isCz ? "Neznámý odesílatel" : "Unknown sender")}
                  </span>
                  <StatusPill status={r.status} isCz={isCz} />
                </div>
                <div className="mbx-item__subject">
                  {r.subject || (isCz ? "(bez předmětu)" : "(no subject)")}
                </div>
                <div className="mbx-item__meta">
                  <span>
                    {new Date(r.receivedAt).toLocaleDateString(
                      isCz ? "cs-CZ" : "en-GB",
                    )}
                  </span>
                  {r.parsed && (
                    <span className="mbx-item__amount">
                      {money(calcTotal(r.parsed))} {r.parsed.currency || ""}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="mbx-detail card">
          {!selected ? (
            <div className="mbx-list__empty">
              <FileText size={22} strokeWidth={1.5} />
              <p>{isCz ? "Vyberte fakturu" : "Select an invoice"}</p>
            </div>
          ) : (
            <>
              <div className="mbx-detail__head">
                <div>
                  <div className="mbx-detail__subject">
                    {selected.subject ||
                      (isCz ? "(bez předmětu)" : "(no subject)")}
                  </div>
                  <div className="mbx-detail__from">
                    {selected.fromName ? `${selected.fromName} · ` : ""}
                    {selected.from}
                  </div>
                </div>
                <StatusPill status={selected.status} isCz={isCz} />
              </div>

              {/* Parse status banner */}
              {selected.parseStatus === "pending" && (
                <div className="mbx-banner mbx-banner--info">
                  <Loader2 size={ICON_SM} className="mbx-spin" />{" "}
                  {isCz ? "Zpracování…" : "Processing…"}
                </div>
              )}
              {selected.parseStatus === "failed" && (
                <div className="mbx-banner mbx-banner--warn">
                  <AlertTriangle size={ICON_SM} />{" "}
                  {isCz
                    ? "Automatické čtení selhalo — vyplňte ručně."
                    : "Auto-read failed — fill in manually."}
                </div>
              )}
              {selected.parseStatus === "done" && (
                <div className="mbx-banner mbx-banner--ok">
                  <Sparkles size={ICON_SM} />{" "}
                  {isCz
                    ? "Údaje vyčteny automaticky — zkontrolujte je."
                    : "Fields read automatically — please review."}
                </div>
              )}

              {/* Attachment preview */}
              {selected.attachments.length > 0 && (
                <div className="mbx-attach">
                  {selected.attachments.map((a) => {
                    const url = attachmentUrl(selected.id, a.index);
                    const isImg = a.contentType.startsWith("image/");
                    const isPdf = a.contentType === "application/pdf";
                    return (
                      <div key={a.index} className="mbx-attach__item">
                        {isImg ? (
                          <img
                            src={url}
                            alt={a.filename}
                            className="mbx-attach__img"
                          />
                        ) : isPdf ? (
                          <iframe
                            src={url}
                            title={a.filename}
                            className="mbx-attach__frame"
                          />
                        ) : null}
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="mbx-attach__link"
                        >
                          <FileText size={ICON_SM} strokeWidth={STROKE} />{" "}
                          {a.filename}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Editable parsed fields */}
              {draft ? (
                <div className="mbx-fields">
                  <div className="mbx-field mbx-field--wide">
                    <label>{isCz ? "Dodavatel" : "Supplier"}</label>
                    <input
                      value={draft.supplierName || ""}
                      onChange={(e) => setField("supplierName", e.target.value)}
                    />
                  </div>
                  <div className="mbx-field">
                    <label>IČO</label>
                    <input
                      value={draft.supplierIco || ""}
                      onChange={(e) => setField("supplierIco", e.target.value)}
                    />
                  </div>
                  <div className="mbx-field">
                    <label>{isCz ? "Měna" : "Currency"}</label>
                    <input
                      value={draft.currency || ""}
                      onChange={(e) => setField("currency", e.target.value)}
                    />
                  </div>
                  <div className="mbx-field">
                    <label>{isCz ? "Datum vystavení" : "Issue date"}</label>
                    <input
                      type="date"
                      value={draft.issueDate || ""}
                      onChange={(e) => setField("issueDate", e.target.value)}
                    />
                  </div>
                  <div className="mbx-field">
                    <label>{isCz ? "Splatnost" : "Due date"}</label>
                    <input
                      type="date"
                      value={draft.dueDate || ""}
                      onChange={(e) => setField("dueDate", e.target.value)}
                    />
                  </div>
                  <div className="mbx-field">
                    <label>
                      {isCz ? "Variabilní symbol" : "Variable symbol"}
                    </label>
                    <input
                      value={draft.variableSymbol || ""}
                      onChange={(e) =>
                        setField("variableSymbol", e.target.value)
                      }
                    />
                  </div>

                  {(draft.items || []).length > 0 && (
                    <div className="mbx-items mbx-field--wide">
                      <label>{isCz ? "Položky" : "Line items"}</label>
                      {(draft.items || []).map((it: any, idx: number) => (
                        <div key={idx} className="mbx-item-row">
                          <input
                            className="mbx-item-row__name"
                            value={it.name || ""}
                            onChange={(e) =>
                              setItemField(idx, "name", e.target.value)
                            }
                            placeholder={isCz ? "Popis" : "Description"}
                          />
                          <input
                            className="mbx-item-row__num"
                            type="number"
                            value={it.qty ?? ""}
                            onChange={(e) =>
                              setItemField(idx, "qty", Number(e.target.value))
                            }
                            placeholder={isCz ? "Ks" : "Qty"}
                          />
                          <input
                            className="mbx-item-row__num"
                            type="number"
                            value={it.price ?? ""}
                            onChange={(e) =>
                              setItemField(idx, "price", Number(e.target.value))
                            }
                            placeholder={isCz ? "Cena" : "Price"}
                          />
                          <input
                            className="mbx-item-row__num"
                            type="number"
                            value={it.taxRate ?? ""}
                            onChange={(e) =>
                              setItemField(
                                idx,
                                "taxRate",
                                Number(e.target.value),
                              )
                            }
                            placeholder="%"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mbx-total mbx-field--wide">
                    <span>{isCz ? "Celkem" : "Total"}</span>
                    <strong>
                      {money(calcTotal(draft))} {draft.currency || ""}
                    </strong>
                  </div>
                </div>
              ) : (
                selected.textPreview && (
                  <p className="mbx-preview">{selected.textPreview}</p>
                )
              )}

              {/* Actions */}
              <div className="mbx-actions">
                <button
                  className="mbx-btn mbx-btn--primary"
                  onClick={handleApprove}
                  disabled={busy || selected.status === "approved"}
                >
                  <CheckCircle2 size={ICON_SM} strokeWidth={STROKE} />
                  {selected.status === "approved"
                    ? isCz
                      ? "Schváleno"
                      : "Approved"
                    : isCz
                      ? "Schválit"
                      : "Approve"}
                </button>
                <button
                  className="mbx-btn mbx-btn--ghost"
                  onClick={handleReject}
                  disabled={busy || selected.status === "rejected"}
                >
                  <X size={ICON_SM} strokeWidth={STROKE} />
                  {isCz ? "Zamítnout" : "Reject"}
                </button>
                <button
                  className="mbx-btn mbx-btn--danger"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  <Trash2 size={ICON_SM} strokeWidth={STROKE} />
                  {isCz ? "Smazat" : "Delete"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, isCz }: { status: string; isCz: boolean }) {
  const label =
    status === "approved"
      ? isCz
        ? "Schváleno"
        : "Approved"
      : status === "rejected"
        ? isCz
          ? "Zamítnuto"
          : "Rejected"
        : isCz
          ? "Ke schválení"
          : "Pending";
  return <span className={`mbx-pill mbx-pill--${status}`}>{label}</span>;
}
