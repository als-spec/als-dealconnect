import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import GradientButton from "../GradientButton";
import { ShieldCheck } from "lucide-react";

const NDA_CONTENT = {
  tc: {
    title: "Transaction Coordinator Non-Disclosure Agreement",
    body: `This Non-Disclosure Agreement ("Agreement") is entered into by and between ALS DealConnect, LLC ("Company") and the undersigned Transaction Coordinator ("TC").

1. CONFIDENTIAL INFORMATION
The TC acknowledges that through the Platform, they will have access to confidential information including but not limited to: investor contact details, deal terms, financial information, lending criteria, property data, and proprietary business strategies of other members.

2. NON-DISCLOSURE OBLIGATIONS
The TC agrees to:
(a) Keep all Confidential Information strictly confidential;
(b) Not disclose any Confidential Information to any third party without prior written consent;
(c) Use Confidential Information solely for the purpose of providing transaction coordination services through the Platform;
(d) Not use any Confidential Information for personal gain outside of authorized Platform activities.

3. NON-SOLICITATION
The TC agrees not to directly solicit or attempt to recruit any member, investor, or lender encountered through the Platform for services outside the Platform for a period of 24 months following termination of membership.

4. DATA PROTECTION
The TC shall comply with all applicable data protection laws and regulations when handling member information obtained through the Platform.

5. TERM AND TERMINATION
This Agreement shall remain in effect for the duration of the TC's membership and for 36 months following termination of membership, regardless of the reason for termination.

6. REMEDIES
The TC acknowledges that breach of this Agreement may cause irreparable harm and that the Company shall be entitled to seek injunctive relief in addition to any other legal remedies available.

By accepting this Agreement, the TC confirms they have read, understood, and agree to be bound by all terms and conditions herein.`,
  },
  investor: {
    title: "Investor/Agent Non-Disclosure Agreement",
    body: `This Non-Disclosure Agreement ("Agreement") is entered into by and between ALS DealConnect, LLC ("Company") and the undersigned Investor/Agent ("Member").

1. CONFIDENTIAL INFORMATION
The Member acknowledges that through the Platform, they will have access to confidential information including but not limited to: TC service rates and strategies, lending criteria, other investor deal terms, proprietary matching algorithms, and member personal information.

2. NON-DISCLOSURE OBLIGATIONS
The Member agrees to:
(a) Maintain strict confidentiality of all information obtained through the Platform;
(b) Not share deal details, TC profiles, or lender information with unauthorized parties;
(c) Use Platform information solely for conducting legitimate real estate transactions;
(d) Not reverse-engineer or attempt to circumvent Platform processes.

3. NON-CIRCUMVENTION
The Member agrees not to circumvent the Platform to directly engage TCs or Lenders encountered through ALS DealConnect without Platform involvement for a period of 24 months.

4. DEAL CONFIDENTIALITY
All deal information posted to the Deal Board remains confidential to Platform members and may not be shared externally without express written permission.

5. TERM AND TERMINATION
This Agreement remains in effect during active membership and for 36 months following termination.

6. REMEDIES
Breach of this Agreement may result in immediate membership termination and legal action for damages.

By accepting this Agreement, the Member confirms they have read, understood, and agree to be bound by all terms and conditions herein.`,
  },
  pml: {
    title: "Private Money Lender Non-Disclosure Agreement",
    body: `This Non-Disclosure Agreement ("Agreement") is entered into by and between ALS DealConnect, LLC ("Company") and the undersigned Private Money Lender ("PML").

1. CONFIDENTIAL INFORMATION
The PML acknowledges that through the Platform, they will have access to confidential information including but not limited to: borrower financial details, property appraisals, deal structures, investor strategies, and other lender terms and criteria.

2. NON-DISCLOSURE OBLIGATIONS
The PML agrees to:
(a) Keep all borrower and deal information strictly confidential;
(b) Not disclose lending criteria or competitive information obtained through the Platform;
(c) Use Confidential Information solely for evaluating and funding deals through the Platform;
(d) Implement appropriate security measures to protect all Confidential Information.

3. NON-SOLICITATION & NON-CIRCUMVENTION
The PML agrees not to directly solicit borrowers, investors, or TCs encountered through the Platform for off-Platform transactions for a period of 24 months.

4. REGULATORY COMPLIANCE
The PML represents that all lending activities comply with applicable federal and state lending regulations and licensing requirements.

5. TERM AND TERMINATION
This Agreement remains in effect during active membership and for 36 months following termination.

6. REMEDIES
Breach of this Agreement may result in immediate membership termination, removal from the PML Directory, and legal action.

By accepting this Agreement, the PML confirms they have read, understood, and agree to be bound by all terms and conditions herein.`,
  },
};

export default function NDAStep({ memberType, onAccept, onDecline, onBack }) {
  const [agreed, setAgreed] = useState(false);
  const nda = NDA_CONTENT[memberType] || NDA_CONTENT.investor;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-navy">{nda.title}</h2>
        <p className="text-slate-text mt-1">Please read carefully before proceeding</p>
      </div>

      <div className="bg-white rounded-xl border border-border">
        <ScrollArea className="h-[340px] p-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-text font-normal">
            {nda.body}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-start gap-3 p-4 bg-teal/5 rounded-xl border border-teal/20">
        <Checkbox
          id="nda-agree"
          checked={agreed}
          onCheckedChange={setAgreed}
          className="mt-0.5"
        />
        <label htmlFor="nda-agree" className="text-sm text-navy font-medium cursor-pointer leading-relaxed">
          I have read, understood, and agree to the terms of this Non-Disclosure Agreement. I understand that violation of these terms may result in termination and legal action.
        </label>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onDecline} className="border-destructive/30 text-destructive hover:bg-destructive/5">
            Decline
          </Button>
          <GradientButton onClick={onAccept} disabled={!agreed} className="px-10">
            Accept & Continue
          </GradientButton>
        </div>
      </div>
    </div>
  );
}