"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  CheckCheck,
  Video,
  Calendar,
  Clock,
  HeartPulse,
  RefreshCw,
  Loader2,
  X,
  ExternalLink,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  senderId: string;
  content: string;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    avatar?: string | null;
  };
}

export default function ConsultationChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [consultation, setConsultation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inputContent, setInputContent] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = (session?.user as any)?.id;
  const isDietitian = (session?.user as any)?.role === "DIETITIAN";

  const fetchConsultation = useCallback(async () => {
    try {
      const res = await fetch(`/api/consultations/${params.id}`);
      const data = await res.json();
      if (data.success && data.consultation) {
        setConsultation(data.consultation);
      } else {
        setError(data.error || "Failed to load consultation.");
      }
    } catch {
      setError("Network error loading consultation.");
    }
  }, [params.id]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/consultations/${params.id}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch {
      // Silent error during polling
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  // Initial load
  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchConsultation();
      fetchMessages();
    } else if (authStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/consultations/${params.id}/chat`);
    }
  }, [authStatus, fetchConsultation, fetchMessages, params.id, router]);

  // Polling every 3.5s for real-time messages
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const interval = setInterval(() => {
      fetchMessages();
    }, 3500);
    return () => clearInterval(interval);
  }, [authStatus, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() && !imageUrlInput.trim()) return;

    setSending(true);
    const content = inputContent.trim() || (imageUrlInput ? "Shared a food photo for review" : "");
    const imageUrl = imageUrlInput.trim() || undefined;

    try {
      const res = await fetch(`/api/consultations/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setInputContent("");
        setImageUrlInput("");
        setShowPhotoModal(false);
      } else {
        alert(data.error || "Failed to deliver message.");
      }
    } catch {
      alert("Network error sending message.");
    } finally {
      setSending(false);
    }
  };

  const otherPersonName = isDietitian
    ? consultation?.customer?.name || "Client"
    : consultation?.dietitian?.fullName || "Dietitian Specialist";

  const otherPersonRole = isDietitian ? "Client" : "Clinical Dietitian";

  const otherPersonAvatar = isDietitian
    ? consultation?.customer?.avatar
    : consultation?.dietitian?.profileImageUrl;

  if (loading && !consultation) {
    return (
      <div className="min-h-screen py-24 text-center space-y-3 bg-[#FDFEFC]">
        <Loader2 className="w-8 h-8 text-[#2F7D16] animate-spin mx-auto" />
        <p className="text-xs font-bold text-nutri-secondary">Opening secure consultation chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-24 px-4 max-w-md mx-auto text-center space-y-4 bg-[#FDFEFC]">
        <h2 className="text-lg font-bold text-rose-700">Access Restricted</h2>
        <p className="text-xs text-nutri-secondary">{error}</p>
        <Link href="/consultations">
          <Button variant="outline" className="rounded-full text-xs font-bold">
            ← Back to Consultations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F7EE]/40 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7E2] shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={isDietitian ? "/dietitian" : "/consultations"}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-nutri-charcoal transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-[#E5E7E2] shrink-0">
                <Image
                  src={
                    otherPersonAvatar ||
                    "https://images.unsplash.com/photo-1594824813511-236be048b64a?auto=format&fit=crop&w=200&q=80"
                  }
                  alt={otherPersonName}
                  fill
                  className="object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-extrabold font-heading text-nutri-charcoal leading-snug">
                    {otherPersonName}
                  </h1>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                    {otherPersonRole}
                  </span>
                </div>
                <p className="text-[10px] text-nutri-secondary">
                  Private Session • {consultation?.timeSlot}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {consultation?.meetingLink && (
              <a
                href={consultation.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#2F7D16] hover:bg-[#24630F] text-white flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Join Video Call</span>
              </a>
            )}

            {!isDietitian && consultation?.dietPlan && (
              <Link
                href="/consultations"
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#EAF4E3] text-[#2F7D16] border border-[#2F7D16]/20 hover:bg-[#F3F7EE] transition-colors hidden sm:inline-flex items-center gap-1"
              >
                <span>View Diet Plan</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Chat Messages Stream */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4 overflow-y-auto">
        {/* Security & Confidentiality Pill */}
        <div className="text-center py-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-nutri-secondary font-medium px-3 py-1 rounded-full bg-white border border-[#E5E7E2] shadow-2xs">
            🔒 Private, end-to-end authorized clinical consultation
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="py-16 text-center text-xs text-nutri-secondary space-y-2">
            <p className="font-semibold text-nutri-charcoal">No messages exchanged yet</p>
            <p className="text-[11px] text-nutri-muted max-w-xs mx-auto">
              Start the consultation by sending a message or sharing a meal photo for nutritional review.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs shadow-2xs space-y-2 leading-relaxed ${
                    isMe
                      ? "bg-[#2F7D16] text-white rounded-br-xs"
                      : "bg-white text-nutri-charcoal border border-[#E5E7E2] rounded-bl-xs"
                  }`}
                >
                  {/* Food Photo Attachment */}
                  {msg.imageUrl && (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-black/10 border border-white/20">
                      <Image
                        src={msg.imageUrl}
                        alt="Shared meal photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-nutri-muted px-1">
                  <span>{timeStr}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-[#2F7D16]" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Photo Attachment Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full border border-[#E5E7E2] shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7E2]">
              <h3 className="text-sm font-bold font-heading text-nutri-charcoal flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#2F7D16]" />
                Share Meal / Food Photo
              </h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-nutri-secondary">
              Enter the image URL of your homemade food or restaurant meal for dietitian review:
            </p>

            <input
              type="url"
              placeholder="https://example.com/meal-photo.jpg"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl px-3 py-2 text-xs text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:border-[#2F7D16] focus:bg-white"
            />

            {/* Quick Demo Previews for Testing */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-nutri-muted uppercase">
                Quick Sample Photos:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setImageUrlInput(
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
                    )
                  }
                  className="p-2 rounded-xl bg-[#F3F7EE] hover:bg-[#EAF4E3] text-[#2F7D16] font-semibold border border-[#E5E7E2] text-left truncate"
                >
                  🥗 High-Protein Salad Bowl
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setImageUrlInput(
                      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80"
                    )
                  }
                  className="p-2 rounded-xl bg-[#F3F7EE] hover:bg-[#EAF4E3] text-[#2F7D16] font-semibold border border-[#E5E7E2] text-left truncate"
                >
                  🍲 Indian Dal &amp; Paneer
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPhotoModal(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setShowPhotoModal(false)}
                className="bg-[#2F7D16] hover:bg-[#24630F] text-white rounded-full text-xs font-bold px-4"
              >
                Attach Photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <footer className="sticky bottom-0 bg-white border-t border-[#E5E7E2] p-3 sm:p-4">
        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3"
        >
          {/* Photo Share Button */}
          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className={`p-2.5 rounded-full border transition-colors cursor-pointer shrink-0 ${
              imageUrlInput
                ? "bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]"
                : "bg-[#F3F7EE] text-nutri-secondary hover:text-[#2F7D16] border-[#E5E7E2]"
            }`}
            title="Attach Food Photo"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={
                imageUrlInput
                  ? "Photo attached! Add an optional note..."
                  : "Type a message or question about your diet plan..."
              }
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-full pl-4 pr-10 py-2.5 text-xs sm:text-sm text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:border-[#2F7D16] focus:bg-white transition-all"
            />
            {imageUrlInput && (
              <button
                type="button"
                onClick={() => setImageUrlInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={sending || (!inputContent.trim() && !imageUrlInput.trim())}
            className="rounded-full bg-[#2F7D16] hover:bg-[#24630F] text-white p-2.5 sm:px-5 sm:py-2.5 font-bold text-xs shrink-0 shadow-xs disabled:opacity-40 cursor-pointer transition-all"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="hidden sm:inline">Send</span>
                <Send className="w-3.5 h-3.5" />
              </span>
            )}
          </Button>
        </form>
      </footer>
    </div>
  );
}
