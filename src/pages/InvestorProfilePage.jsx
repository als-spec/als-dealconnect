import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, useNavigate } from "react-router-dom";
import InvestorProfileEditForm from "../components/profile/InvestorProfileEditForm";
import TagPill from "../components/TagPill";
import GradientButton from "../components/GradientButton";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, Pencil, MessageSquare, ClipboardList, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-muted/40 rounded-xl p-4 text-center">
      <Icon className="w-5 h-5 text-teal mx-auto mb-2" />
      <p className="text-xl font-extrabold text-navy">{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function InvestorProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const profileUserId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = !profileUserId || profileUserId === currentUser?.id;

  useEffect(() => { load(); }, [profileUserId]);

  const load = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setCurrentUser(me);
    const targetId = profileUserId || me.id;

    const profiles = await base44.entities.InvestorProfile.filter({ user_id: targetId });
    if (profiles.length > 0) setProfile(profiles[0]);

    if (!profileUserId || profileUserId === me.id) {
      setProfileUser(me);
    }

    setLoading(false);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    if (profile?.id) {
      await base44.entities.InvestorProfile.update(profile.id, formData);
    } else {
      const created = await base44.entities.InvestorProfile.create({ ...formData, user_id: currentUser.id });
      setProfile(created);
    }
    toast.success("Profile saved successfully");
    setSaving(false);
    setEditing(false);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profileUser?.full_name || currentUser?.full_name || "Investor";
  const company = profile?.company_name || profileUser?.company_name || currentUser?.company_name || "";
  const state = profile?.state || profileUser?.state || currentUser?.state || "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-20 gradient-primary opacity-20" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            <div className="w-20 h-20 rounded-full p-0.5 gradient-primary shadow-lg shrink-0">
              <div className="w-full h-full rounded-full bg-navy flex items-center justify-center">
                <span className="text-2xl font-extrabold text-white">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold text-navy">{displayName}</h1>
                  {profile?.investment_focus && (
                    <p className="text-slate-text font-medium mt-0.5">{profile.investment_focus}</p>
                  )}
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
                    <Button variant="outline" className="gap-2">
                      <MessageSquare className="w-4 h-4" /> Send Message
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold text-navy mb-5">Edit Profile</h2>
          <InvestorProfileEditForm profile={profile} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={ClipboardList} label="Deals Posted" value={profile?.deals_posted || 0} />
              <StatCard icon={Users} label="TC Connections" value={profile?.tc_connections || 0} />
              <StatCard icon={TrendingUp} label="Active Requests" value={0} />
            </div>

            {/* Bio */}
            {profile?.bio && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-lg font-bold text-navy mb-3">About</h3>
                <p className="text-sm leading-relaxed text-slate-text">{profile.bio}</p>
              </div>
            )}

            {/* Deal types */}
            {profile?.deal_types?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-base font-bold text-navy mb-3">Active Deal Types</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.deal_types.map((t) => <TagPill key={t} label={t} variant="teal" />)}
                </div>
              </div>
            )}

            {/* Target markets */}
            {profile?.target_markets?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-base font-bold text-navy mb-3">Target Markets</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.target_markets.map((m) => <TagPill key={m} label={m} variant="cyan" />)}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar quick actions */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h3 className="font-bold text-navy text-sm">Quick Actions</h3>
              <GradientButton className="w-full justify-center" onClick={() => navigate("/deal-board")}>Post a New Deal</GradientButton>
              <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/tc-directory")}>
                <Users className="w-4 h-4" /> Browse TC Directory
              </Button>
            </div>

            {isOwner && !profile && (
              <div className="bg-card rounded-2xl border border-dashed border-teal/30 p-5 text-center">
                <p className="text-sm text-muted-foreground mb-3">Set up your investor profile to get started</p>
                <GradientButton onClick={() => setEditing(true)} className="text-sm px-6">Set Up Profile</GradientButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}