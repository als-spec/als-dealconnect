import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Logo from "../components/Logo";
import OnboardingProgress from "../components/onboarding/OnboardingProgress";
import RegistrationStep from "../components/onboarding/RegistrationStep";
import PlanSelectionStep from "../components/onboarding/PlanSelectionStep";
import NDAStep from "../components/onboarding/NDAStep";
import PendingApprovalStep from "../components/onboarding/PendingApprovalStep";



export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState("registration");
  const [loading, setLoading] = useState(true);
  const [paymentError, setPaymentError] = useState("");
  const [formData, setFormData] = useState({
    phone: "",
    company_name: "",
    state: "",
    member_type: "",
    selected_plan: "",
  });

  useEffect(() => {
    loadUserState();
  }, []);

  const loadUserState = async () => {
    // Handle Stripe return URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    if (paymentStatus) {
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
      phone: user.phone || "",
      company_name: user.company_name || "",
      state: user.state || "",
      member_type: user.member_type || "",
      selected_plan: user.selected_plan || "",
    });

    if (paymentStatus === "success") {
      setStep("nda");
      setLoading(false);
      return;
    }
    if (paymentStatus === "cancel") {
      setPaymentError("Payment was cancelled. Please try again to continue.");
      setStep("plan_selection");
      setLoading(false);
      return;
    }

    if (user.onboarding_step && user.onboarding_step !== "registration") {
      setStep(user.onboarding_step);
    }
    setLoading(false);
  };

  const updateForm = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleRegistrationNext = async () => {
    await base44.auth.updateMe({
      phone: formData.phone,
      company_name: formData.company_name,
      state: formData.state,
      member_type: formData.member_type,
      onboarding_step: "plan_selection",
    });
    setStep("plan_selection");
  };

  const handlePlanNext = async () => {
    await base44.auth.updateMe({
      selected_plan: formData.selected_plan,
      onboarding_step: "nda",
    });
    setStep("nda");
  };

  const handleNDAAccept = async () => {
    await base44.auth.updateMe({
      onboarding_step: "pending_approval",
      member_status: "pending",
    });
    const user = await base44.auth.me();
    await base44.entities.MemberApplication.create({
      email: user.email,
      full_name: user.full_name,
      phone: formData.phone,
      company_name: formData.company_name,
      state: formData.state,
      member_type: formData.member_type,
      selected_plan: formData.selected_plan,
      nda_accepted: true,
      nda_accepted_date: new Date().toISOString(),
      status: "pending",
      user_id: user.id,
    });
    setStep("pending_approval");
  };

  const handleNDADecline = () => {
    setStep("registration");
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
          {step === "registration" && (
            <RegistrationStep
              data={formData}
              onUpdate={updateForm}
              onNext={handleRegistrationNext}
            />
          )}
          {step === "plan_selection" && (
            <PlanSelectionStep
              memberType={formData.member_type}
              onBack={() => setStep("registration")}
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