"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Invitation = {
  storyId: string;
  storyName: string;
  storyDescription: string | null;
  invitedBy: string;
  membershipId: string;
};

type InvitationPopupProps = {
  invitations: Invitation[];
};

export function InvitationPopup({ invitations }: InvitationPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(invitations.length > 0);
  const router = useRouter();

  useEffect(() => {
    setIsVisible(invitations.length > 0);
  }, [invitations.length]);

  if (!isVisible || invitations.length === 0) return null;

  const currentInvitation = invitations[currentIndex];

  const handleAccept = async () => {
    // Mark as viewed
    await fetch("/api/story/mark-invitation-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: currentInvitation.membershipId }),
    });

    // Show next invitation or close
    if (currentIndex < invitations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsVisible(false);
      router.refresh();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg animate-in zoom-in-95 fade-in duration-300">
          {/* Card */}
          <div className="relative rounded-2xl border bg-gradient-to-br from-background via-background to-muted shadow-2xl overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            {/* Content */}
            <div className="relative p-8 space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-4 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                    />
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">
                  You've Been Invited! 🎉
                </h2>
                <p className="text-lg text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {currentInvitation.invitedBy}
                  </span>{" "}
                  has invited you to collaborate on
                </p>
                <div className="pt-2">
                  <div className="inline-block rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 px-6 py-3">
                    <p className="text-2xl font-bold tracking-tight">
                      {currentInvitation.storyName}
                    </p>
                    {currentInvitation.storyDescription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentInvitation.storyDescription}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className="flex flex-col items-center gap-3 pt-4">
                <button
                  onClick={handleAccept}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-base font-semibold text-white hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {currentIndex < invitations.length - 1
                    ? "Next Invitation →"
                    : "Start Exploring →"}
                </button>
                {invitations.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {currentIndex + 1} of {invitations.length} invitations
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
