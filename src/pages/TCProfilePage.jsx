import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams } from "react-router-dom";
import ReviewForm from "../components/reviews/ReviewForm";
import TCStatBar from "../components/profile/TCStatBar";
import ServiceRateCard from "../components/profile/ServiceRateCard";
import ReviewCard from "../components/profile/ReviewCard";
import TCProfileEditForm from "../components/profile/TCProfileEditForm";
import StarRating from "../components/StarRating";
import TagPill from "../components/TagPill";
import GradientButton from "../components/GradientButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, ShieldCheck, Pencil, MessageSquare, CheckCircle2, Award } from "lucide-react";
import { toast } from "sonner";

export default function TCProfilePage() {
  const [searchParams] = useSearchParams();
  const profileUserId = searchParams.get("id");

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const isOwner = !profileUserId || profileUserId === currentUser?.id;

  useEffect(() => {
    load();
  }, [profileUserId]);

  const load = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setCurrentUser(me);
    const targetId = profileUserId || me.id;

    const profiles = await base44.entities.TCProfile.filter({ user_id: targetId });
    if (profiles.length > 0) {
      setProfile(profiles[0]);
      const revs = await base44.entities.Review.filter({ tc_profile_id: profiles[0].id });
      setReviews(revs);
    }

    // For own profile use me; for others (admin viewing) try User entity
    if (!profileUserId || profileUserId === me.id) {
      setProfileUser(me);
    } else {
      const users = await base44.entities.User.filter({ id: targetId });
      if (users.length > 0) setProfileUser(users[0]);
    }

    setLoading(false);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    const data = {
      ...formData,
      years_experience: Number(formData.years_experience) || 0,
      deals_closed: Number(formData.deals_closed) || 0,
      response_rate: Number(formData.response_rate) || 0,
    };
    if (profile?.id) {
      await base44.entities.TCProfile.update(profile.id, data);
    } else {
      const created = await base44.entities.TCProfile.create({ ...data, user_id: currentUser.id });
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

  const displayName = profileUser?.full_name || currentUser?.full_name || "TC Member";
  const company = profileUser?.company_name || currentUser?.company_name || "";
  const state = profile?.state || profileUser?.state || currentUser?.state || "";

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Top gradient banner */}
        <div className="h-24 gradient-primary opacity-20" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Avatar with teal gradient ring */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full p-0.5 gradient-primary shadow-lg shadow-teal/20">
                <div className="w-full h-full rounded-full bg-navy flex items-center justify-center">
                  <span className="text-3xl font-extrabold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
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
                        <ShieldCheck className="w-3 h-3" /> Verified TC
                      </Badge>
                    )}
                  </div>
                  {profile?.title && (
                    <p className="text-slate-text font-medium mt-0.5">{profile.title}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                    {company && (
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{company}</span>
                    )}
                    {state && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{state}</span>
                    )}
                  </div>
                  {(profile?.average_rating || 0) > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <StarRating rating={profile.average_rating} size="sm" showValue />
                      <span className="text-xs text-muted-foreground">({profile.review_count || 0} reviews)</span>
                    </div>
                  )}
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
                      {currentUser?.role === "investor" && profile && (
                        <Button variant="outline" className="gap-2" onClick={() => setShowReviewForm(true)}>
                          <Award className="w-4 h-4" /> Leave Review
                        </Button>
                      )}
                      <GradientButton className="gap-2">Request Services</GradientButton>
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
          <h2 className="text-lg font-bold text-navy mb-5">Edit Profile</h2>
          <TCProfileEditForm profile={profile} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          {profile && <TCStatBar profile={profile} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Specialties */}
              {profile?.specialties?.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-navy">Specialties</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((s) => (
                      <TagPill key={s} label={s} variant="teal" />
                    ))}
                  </div>
                </div>
              )}

              {/* About */}
              {(profile?.bio || profile?.geographic_coverage || profile?.certifications) && (
                <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
                  <h3 className="text-lg font-bold text-navy">About</h3>
                  {profile?.bio && (
                    <div>
                      <p className="text-sm leading-relaxed text-slate-text">{profile.bio}</p>
                    </div>
                  )}
                  {profile?.geographic_coverage && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Geographic Coverage</p>
                      <p className="text-sm text-slate-text">{profile.geographic_coverage}</p>
                    </div>
                  )}
                  {profile?.certifications && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Certifications</p>
                      <p className="text-sm text-slate-text">{profile.certifications}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-navy">Reviews</h3>
                  {profile?.review_count > 0 && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={profile.average_rating} size="sm" />
                      <span className="text-sm font-bold text-navy">{Number(profile.average_rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No reviews yet</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {profile && <ServiceRateCard profile={profile} />}

              {/* Empty state prompt for owner */}
              {isOwner && !profile && (
                <div className="bg-card rounded-2xl border border-dashed border-teal/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Complete your profile to appear in the TC Directory</p>
                  <GradientButton onClick={() => setEditing(true)} className="text-sm px-6">
                    Set Up Profile
                  </GradientButton>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>

    {showReviewForm && profile && (
      <ReviewForm
        tcProfileId={profile.id}
        tcName={displayName}
        currentUser={currentUser}
        onClose={() => setShowReviewForm(false)}
        onSubmitted={load}
      />
    )}
    </>
  );
}