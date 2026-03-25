import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientButton from "../GradientButton";
import { Building2, User, Briefcase, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const MEMBER_TYPES = [
  {
    value: "tc",
    label: "Transaction Coordinator",
    description: "Manage and coordinate real estate transactions",
    icon: Briefcase,
  },
  {
    value: "investor",
    label: "Investor / Agent",
    description: "Post deals and find coordination services",
    icon: Building2,
  },
  {
    value: "pml",
    label: "Private Money Lender",
    description: "Provide funding for real estate deals",
    icon: DollarSign,
  },
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming"
];

export default function RegistrationStep({ data, onUpdate, onNext }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!data.phone) errs.phone = "Phone is required";
    if (!data.company_name) errs.company_name = "Company name is required";
    if (!data.state) errs.state = "State is required";
    if (!data.member_type) errs.member_type = "Please select a member type";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4">
          <User className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-navy">Complete Your Profile</h2>
        <p className="text-slate-text mt-1">Tell us about yourself and your role</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-navy font-semibold">Phone Number</Label>
          <Input
            placeholder="(555) 123-4567"
            value={data.phone || ""}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className={cn("bg-white border-border", errors.phone && "border-destructive")}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-navy font-semibold">Company Name</Label>
          <Input
            placeholder="Your company or brokerage"
            value={data.company_name || ""}
            onChange={(e) => onUpdate({ company_name: e.target.value })}
            className={cn("bg-white border-border", errors.company_name && "border-destructive")}
          />
          {errors.company_name && <p className="text-sm text-destructive">{errors.company_name}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-navy font-semibold">State / Location</Label>
        <Select value={data.state || ""} onValueChange={(v) => onUpdate({ state: v })}>
          <SelectTrigger className={cn("bg-white", errors.state && "border-destructive")}>
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
      </div>

      <div className="space-y-3">
        <Label className="text-navy font-semibold">I am a...</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MEMBER_TYPES.map((type) => {
            const Icon = type.icon;
            const selected = data.member_type === type.value;
            return (
              <button
                type="button"
                key={type.value}
                onClick={() => onUpdate({ member_type: type.value })}
                className={cn(
                  "flex flex-col items-center text-center p-5 rounded-xl border-2 transition-all duration-200",
                  selected
                    ? "border-teal bg-teal/5 shadow-md"
                    : "border-border bg-white hover:border-teal/40 hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
                  selected ? "gradient-primary" : "bg-muted"
                )}>
                  <Icon className={cn("w-6 h-6", selected ? "text-white" : "text-muted-foreground")} />
                </div>
                <span className="font-bold text-navy text-sm">{type.label}</span>
                <span className="text-xs text-muted-foreground mt-1">{type.description}</span>
              </button>
            );
          })}
        </div>
        {errors.member_type && <p className="text-sm text-destructive">{errors.member_type}</p>}
      </div>

      <div className="flex justify-end pt-4">
        <GradientButton type="submit" className="px-10">
          Continue to Plans
        </GradientButton>
      </div>
    </form>
  );
}