import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSearchParams } from "react-router-dom";
import PMLLendingCriteria from "../components/profile/PMLLendingCriteria";
import PMLProfileEditForm from "../components/profile/PMLProfileEditForm";
import GradientButton from "../components/GradientButton";
import TagPill from "../components/TagPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, ShieldCheck, Pencil, MessageSquare, CheckCircle2, DollarSign, Clock, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { toastMutationError } from "@/lib/toasts";
import { cn } from "@/lib/utils";

const TIER_STYLES = {
  platinum: { label: "Platinum", class: "bg-violet-50 text-violet-700 border-violet-200" },
  gold: { label: "Gold", class: "bg-amber-50 text-amber-700 border-amber-200" },
  preferred: { label: "Preferred", class: "bg-blue-50 text-blue-700 border-blue-200" },
};

export default function PMLProfilePage() {
  const [searchParams] = useSearchParams();
  const profileUserId = searchParams.get("id");

  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwnProfile = !profileUserId || profileUserId === currentUser?.id;
  const targetId = profileUserId || currentUser?.id;

  // PML profile for the target user.
  const { data: profiles = [], isLoading: loadingProfile } = useQuery({
    queryKey: ['PMLProfile', { user_id: targetId }],
    queryFn: () => base44.entities.PMLProfile.filter({ user_id: targetId }),
    enabled: !!targetId,
  });
  const profile = profiles[0] || null;

  // profileUser: for own profile, reuse currentUser. For admin/other viewing,
  // fetch the User entry. Only runs when NOT viewing own profile.
  const { data: profileUserList = [] } = useQuery({
    queryKey: ['User', { id: targetId }],
    queryFn: () => base44.entities.User.filter({ id: targetId }),
    enabled: !isOwnProfile && !!targetId && !!currentUser,
  });
  const profileUser = isOwnProfile ? currentUser : (profileUserList[0] || null);

  const loading = loadingProfile || !currentUser;

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (profile?.id) {
        await base44.entities.PMLProfile.update(profile.id, formData);
      } else {
        await base44.entities.PMLProfile.create({ ...formData, user_id: currentUser.id });
      }
    } catch (e) {
      console.error("PMLProfile save failed:", e);
      toastMutationError("save profile");
      setSaving(false);
      return;
    }
    toast.success("Profile saved successfully");
    setSaving(false);
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ['PMLProfile', { user_id: targetId }] });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  const isOwner = !profileUserId || profileUserId === currentUser?.id;
  const isInvestor = currentUser?.role === "investor";
  const isAdmin = currentUser?.role === "admin";
  const displayName = profileUser?.full_name || currentUser?.full_name || "PML Member";
  const company = profile?.company_name || profileUser?.company_name || currentUser?.company_name || "";
  const state = profile?.state || profileUser?.state || currentUser?.state || "";
  const tier = TIER_STYLES[profile?.tier] || TIER_STYLES.preferred;

  const stats = [
    { icon: DollarSign, label: "Max Loan Size", value: profile?.loan_max || "—" },
    { icon: TrendingUp, label: "Max LTV", value: profile?.max_ltv || "—" },
    { icon: CheckCircle2, label: "Deals Funded", value: profile?.deals_funded ?? "—" },
    { icon: Clock, label: "Avg Close Time", value: profile?.avg_close_days ? `${profile.avg_close_days} days` : "—" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-24 gradient-primary opacity-20 pointer-events-none" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full p-0.5 gradient-primary shadow-lg shadow-teal/20">
                <div className="w-full h-full rounded-full bg-navy flex items-center justify-center">
                  <span className="text-3xl font-extrabold text-white">{displayName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              {profile?.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-primary flex items-center justify-center border-2 border-card">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-extrabold text-navy">{displayName}</h1>
                    {profile?.is_verified && (
                      <Badge className="bg-teal/10 text-teal border-teal/30 text-xs font-bold gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified Lender
                      </Badge>
                    )}
                    {profile?.tier && (
                      <Badge variant="outline" className={cn("text-xs font-bold", tier.class)}>
                        {tier.label}
                      </Badge>
                    )}
                    {profile?.is_active && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold gap-1">
                        <Zap className="w-3 h-3" /> Active Lender
                      </Badge>
                    )}
                  </div>
                  {profile?.title && <p className="text-slate-text font-medium mt-0.5">{profile.title}</p>}
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                    {company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{company}</span>}
                    {state && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{state}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isOwner ? (
                    <Button variant="outline" onClick={() => setEditing(!editing)} className="gap-2">
                      <Pencil className="w-4 h-4" /> {editing ? "Cancel" : "Edit Profile"}
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="gap-2">
                        <MessageSquare className="w-4 h-4" /> Send Message
                      </Button>
                      {isInvestor && (
                        <GradientButton className="gap-2">Submit a Deal</GradientButton>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold text-navy mb-5">Edit Lender Profile</h2>
          <PMLProfileEditForm profile={profile} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-card rounded-xl border border-border overflow-hidden"
                  style={{ borderTop: "3px solid transparent", borderImage: "linear-gradient(90deg,#00e5b0,#00aaff) 1" }}>
                  <div className="p-4 text-center">
                    <p className="text-xl font-extrabold text-navy">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Bio */}
              {profile?.bio && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-bold text-navy mb-3">About</h3>
                  <p className="text-sm leading-relaxed text-slate-text">{profile.bio}</p>
                </div>
              )}

              {/* Loan types */}
              {profile?.loan_types?.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-base font-bold text-navy mb-4">Loan Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.loan_types.map((t) => <TagPill key={t} label={t} variant="cyan" />)}
                  </div>
                </div>
              )}

              {/* Geographic markets */}
              {profile?.geographic_markets?.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-base font-bold text-navy mb-4">Geographic Markets</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.geographic_markets.map((m) => <TagPill key={m} label={m} variant="teal" />)}
                  </div>
                </div>
              )}

              {/* Deal Inquiries — owner/admin only */}
              {(isOwner || isAdmin) && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-bold text-navy mb-4">Deal Inquiries</h3>
                  <div className="text-center py-8">
                    <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No deal inquiries yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Inquiries from investors will appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {profile && <PMLLendingCriteria profile={profile} />}

              {isInvestor && (
                <GradientButton className="w-full text-sm py-3 text-center justify-center">
                  Submit a Deal to This Lender
                </GradientButton>
              )}

              {isOwner && !profile && (
                <div className="bg-card rounded-2xl border border-dashed border-teal/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Set up your lending profile to appear in the PML Directory</p>
                  <GradientButton onClick={() => setEditing(true)} className="text-sm px-6">Set Up Profile</GradientButton>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}