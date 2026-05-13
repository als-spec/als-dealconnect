import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientButton from "../GradientButton";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

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

const EXPERTISE_OPTIONS = [
  "Subject-To (Sub2)",
  "Seller Finance",
  "Wraps",
  "Fix & Flip",
  "DSCR",
  "Creative Finance",
  "Wholesale",
  "Ground-Up Construction",
  "Short-Term Rental",
  "Bridge Loans",
  "Lease Option",
  "Multi-Family",
  "Commercial",
  "Land",
];

export default function RegistrationStep({ data, onUpdate, onNext }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!data.phone) errs.phone = "Phone is required";
    if (!data.company_name) errs.company_name = "Company name is required";
    if (!data.state) errs.state = "State is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  const toggleExpertise = (area) => {
    const current = data.expertise_areas || [];
    const updated = current.includes(area)
      ? current.filter((a) => a !== area)
      : [...current, area];
    onUpdate({ expertise_areas: updated });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4">
          <User className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-navy">Complete Your Profile</h2>
        <p className="text-slate-text mt-1">Tell us a bit more about yourself</p>
      </div>

      {/* Phone + Company */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-navy font-semibold">Phone Number <span className="text-destructive">*</span></Label>
          <Input
            placeholder="(555) 123-4567"
            value={data.phone || ""}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className={cn("bg-white border-border", errors.phone && "border-destructive")}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-navy font-semibold">Company Name <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Your company or brokerage"
            value={data.company_name || ""}
            onChange={(e) => onUpdate({ company_name: e.target.value })}
            className={cn("bg-white border-border", errors.company_name && "border-destructive")}
          />
          {errors.company_name && <p className="text-sm text-destructive">{errors.company_name}</p>}
        </div>
      </div>

      {/* Website + State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-navy font-semibold">Website <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <Input
            placeholder="https://yourwebsite.com"
            value={data.website || ""}
            onChange={(e) => onUpdate({ website: e.target.value })}
            className="bg-white border-border"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-navy font-semibold">State / Location <span className="text-destructive">*</span></Label>
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
      </div>

      {/* Expertise Areas */}
      <div className="space-y-3">
        <Label className="text-navy font-semibold">
          Areas of Expertise <span className="text-muted-foreground text-xs font-normal">(select all that apply)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map((area) => {
            const selected = (data.expertise_areas || []).includes(area);
            return (
              <button
                type="button"
                key={area}
                onClick={() => toggleExpertise(area)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all duration-150",
                  selected
                    ? "gradient-primary text-white border-transparent shadow"
                    : "bg-white border-border text-muted-foreground hover:border-teal/40"
                )}
              >
                {area}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <GradientButton type="submit" className="px-10">
          Continue to Plans
        </GradientButton>
      </div>
    </form>
  );
}