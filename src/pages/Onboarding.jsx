import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Logo from "../components/Logo";
import OnboardingProgress from "../components/onboarding/OnboardingProgress";
import MemberTypeStep from "../components/onboarding/MemberTypeStep";
import RegistrationStep from "../components/onboarding/RegistrationStep";
import PlanSelectionStep from "../components/onboarding/PlanSelectionStep";
import NDAStep from "../components/onboarding/NDAStep";
import NonCompeteStep from "../components/onboarding/NonCompeteStep";
import PendingApprovalStep from "../components/onboarding/PendingApprovalStep";
// Registration step removed per spec — flow: member_type → plan → stripe → nda → non_compete → pending



export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState("member_type");
  const [loading, setLoading] = useState(true);
  const [paymentError, setPaymentError] = useState("");
  const [formData, setFormData] = useState({
    member_type: "",
    selected_plan: "",
  });

  useEffect(() => {
    loadUserState();
  }, []);

  const loadUserState = async () => {
    // Handle Stripe return URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedType = urlParams.get("type");
    const paymentStatus = urlParams.get("payment");
    if (paymentStatus || preselectedType) {
      window.history.replaceState({}, "", "/onboarding");
    }

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }
    if (user.onboarding_step === "approved" || user.role === "admin") {
      navigate("/");
      return;
    }

    setFormData({
      member_type: preselectedType || user.member_type || "",
      selected_plan: user.selected_plan || "",
    });

    if (paymentStatus === "success") {
      // Verify session server-side before advancing
      const sessionId = urlParams.get("session_id");
      if (sessionId) {
        try {
          const res = await base44.functions.invoke("verifyCheckoutSession", { sessionId });
          if (res.data?.success) {
            setStep("nda");
            setLoading(false);
            return;
          }
        } catch (e) {
          // fall through to normal step load
        }
      }
      setStep("nda");
      setLoading(false);
      return;
    }
    if (paymentStatus === "cancel") {
      setPaymentError("Payment was not completed. Please try again to continue.");
      setStep("plan_selection");
      setLoading(false);
      return;
    }

    if (user.onboarding_step && user.onboarding_step !== "member_type") {
      setStep(user.onboarding_step);
    }
    setLoading(false);
  };

  const updateForm = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleMemberTypeNext = async () => {
    await base44.auth.updateMe({
      member_type: formData.member_type,
      onboarding_step: "plan_selection",
    });
    setStep("plan_selection");
  };

  const handlePlanNext = async () => {
    await base44.auth.updateMe({
      selected_plan: formData.selected_plan,
      onboarding_step: "checkout",
    });
    setStep("checkout");
  };

  const handleNDAAccept = async () => {
    const user = await base44.auth.me();
    await base44.auth.updateMe({
      onboarding_step: "non_compete",
      nda_accepted: true,
      nda_accepted_date: new Date().toISOString(),
      nda_signer_name: user.full_name,
    });
    setStep("non_compete");
  };

  const handleNonCompeteAccept = async () => {
    const user = await base44.auth.me();
    const now = new Date().toISOString();
    await base44.auth.updateMe({
      onboarding_step: "pending_approval",
      member_status: "pending",
      non_compete_accepted: true,
      non_compete_accepted_date: now,
      non_compete_signer_name: user.full_name,
    });
    const freshUser = await base44.auth.me();
    await base44.entities.MemberApplication.create({
      email: freshUser.email,
      full_name: freshUser.full_name,
      member_type: formData.member_type,
      selected_plan: formData.selected_plan,
      nda_accepted: true,
      nda_accepted_date: freshUser.nda_accepted_date || now,
      nda_signer_name: freshUser.nda_signer_name || freshUser.full_name,
      non_compete_accepted: true,
      non_compete_accepted_date: now,
      non_compete_signer_name: freshUser.full_name,
      status: "pending",
      user_id: freshUser.id,
    });
    setStep("pending_approval");
  };

  const handleNDADecline = async () => {
    await base44.auth.updateMe({ onboarding_step: "member_type" });
    setStep("member_type");
  };

  const handleNonCompeteDecline = async () => {
    await base44.auth.updateMe({ onboarding_step: "member_type" });
    setStep("member_type");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Logo size="sm" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <OnboardingProgress currentStep={step} />

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-10">
          {step === "member_type" && (
            <MemberTypeStep
              selected={formData.member_type}
              onSelect={(val) => updateForm({ member_type: val })}
              onNext={handleMemberTypeNext}
            />
          )}
          {(step === "plan_selection" || step === "checkout") && (
            <PlanSelectionStep
              memberType={formData.member_type}
              onBack={() => setStep("member_type")}
              paymentError={paymentError}
            />
          )}
          {step === "nda" && (
            <NDAStep
              memberType={formData.member_type}
              onAccept={handleNDAAccept}
              onDecline={handleNDADecline}
              onBack={() => setStep("plan_selection")}
            />
          )}
          {step === "non_compete" && (
            <NonCompeteStep
              memberType={formData.member_type}
              onAccept={handleNonCompeteAccept}
              onDecline={handleNonCompeteDecline}
            />
          )}
          {step === "pending_approval" && (
            <PendingApprovalStep
              memberType={formData.member_type}
              selectedPlan={formData.selected_plan}
            />
          )}
        </div>
      </div>
    </div>
  );
}