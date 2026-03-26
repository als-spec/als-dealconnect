import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import GradientButton from "../GradientButton";
import { FileText } from "lucide-react";

const NON_COMPETE_CONTENT = {
  tc: {
    title: "Transaction Coordinator Non-Compete Agreement",
    body: `This Non-Compete Agreement ("Agreement") is entered into by and between ALS DealConnect, LLC ("Company") and the undersigned Transaction Coordinator ("TC").

1. SCOPE OF NON-COMPETE
During the term of this Agreement and for a period of twenty-four (24) months following termination of membership ("Restricted Period"), the TC agrees not to:
(a) Operate, participate in, or assist any competing real estate transaction coordination platform that directly competes with ALS DealConnect;
(b) Solicit or accept business from any investor, lender, or member first encountered through the ALS DealConnect Platform for transaction coordination services provided outside the Platform;
(c) Use proprietary information, methods, or contacts obtained through the Platform to establish a competing service.

2. GEOGRAPHIC SCOPE
This restriction applies nationally within the United States, where ALS DealConnect conducts business.

3. LEGITIMATE BUSINESS INTEREST
The TC acknowledges that ALS DealConnect has a legitimate business interest in protecting its member relationships, proprietary matching technology, and deal flow networks.

4. CARVE-OUTS
This Agreement does not restrict the TC from:
(a) Providing transaction coordination services through the ALS DealConnect Platform;
(b) Conducting general real estate business unrelated to the Platform's member base;
(c) Employment in an unrelated industry.

5. CONSIDERATION
In exchange for access to the ALS DealConnect Platform, its member network, and proprietary deal flow technology, the TC agrees to the terms herein.

6. SEVERABILITY
If any provision of this Agreement is found unenforceable, it shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall remain in full force.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the state in which ALS DealConnect, LLC is registered.

By accepting this Agreement, the TC confirms they have read, understood, and agree to be bound by all terms and conditions herein.`,
  },
  investor: {
    title: "Investor/Agent Non-Compete Agreement",
    body: `This Non-Compete Agreement ("Agreement") is entered into by and between ALS DealConnect, LLC ("Company") and the undersigned Investor/Agent ("Member").

1. SCOPE OF NON-COMPETE
During the term of this Agreement and for a period of twenty-four (24) months following termination of membership ("Restricted Period"), the Member agrees not to:
(a) Launch, operate, or materially assist any platform that directly replicates the deal-coordination marketplace model of ALS DealConnect;
(b) Circumvent the Platform to directly transact with TCs or Private Money Lenders first introduced through ALS DealConnect without Platform involvement;
(c) Recruit or solicit Platform members to join a competing service.

2. GEOGRAPHIC SCOPE
This restriction applies nationally within the United States.

3. NON-CIRCUMVENTION
The Member specifically agrees not to contact or transact with any TC or Lender discovered through ALS DealConnect outside the Platform for a period of 24 months from the date of first contact on the Platform.

4. LEGITIMATE BUSINESS INTEREST
The Member acknowledges that ALS DealConnect's proprietary network, vetting processes, and technology represent significant business value warranting this protection.

5. CARVE-OUTS
This Agreement does not restrict the Member from:
(a) Conducting real estate investments through their own channels independent of the Platform's network;
(b) Working with TCs or Lenders they had pre-existing relationships with prior to joining the Platform.

6. CONSIDERATION
Access to ALS DealConnect's vetted TC and Lender networks, deal board, and proprietary matching technology constitutes full consideration for this Agreement.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the state in which ALS DealConnect, LLC is registered.

By accepting this Agreement, the Member confirms they have read, understood, and agree to be bound by all terms and conditions herein.`,
  },
  pml: {
    title: "Private Money Lender Non-Compete Agreement",
    body: `This Non-Compete Agreement ("Agreement") is entered into by and between ALS DealConnect, LLC ("Company") and the undersigned Private Money Lender ("PML").

1. SCOPE OF NON-COMPETE
During the term of this Agreement and for a period of twenty-four (24) months following termination of membership ("Restricted Period"), the PML agrees not to:
(a) Participate in or fund any competing real estate lending marketplace that directly competes with ALS DealConnect's PML directory and deal-matching services;
(b) Directly solicit or fund deals for borrowers, investors, or TCs first introduced through the ALS DealConnect Platform outside the Platform;
(c) Share PML Directory data, member lending criteria, or deal flow information with competing platforms.

2. GEOGRAPHIC SCOPE
This restriction applies nationally within the United States.

3. NON-CIRCUMVENTION
The PML agrees not to directly fund any deal for a borrower or investor first introduced through ALS DealConnect outside the Platform for 24 months from date of introduction.

4. LEGITIMATE BUSINESS INTEREST
The PML acknowledges that ALS DealConnect's borrower network, deal pipeline, and vetting technology represent significant proprietary value.

5. CARVE-OUTS
This Agreement does not restrict the PML from:
(a) Funding deals sourced through their own independent channels;
(b) Working with borrowers they had pre-existing relationships with prior to joining the Platform;
(c) General lending business unrelated to Platform-sourced leads.

6. CONSIDERATION
Inclusion in ALS DealConnect's PML Directory, access to qualified deal flow, and proprietary borrower-matching technology constitutes full consideration for this Agreement.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the state in which ALS DealConnect, LLC is registered.

By accepting this Agreement, the PML confirms they have read, understood, and agree to be bound by all terms and conditions herein.`,
  },
};

export default function NonCompeteStep({ memberType, onAccept, onDecline }) {
  const [agreed, setAgreed] = useState(false);
  const doc = NON_COMPETE_CONTENT[memberType] || NON_COMPETE_CONTENT.investor;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4">
          <FileText className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-navy">{doc.title}</h2>
        <p className="text-slate-text mt-1">Please read carefully before proceeding</p>
      </div>

      <div className="bg-white rounded-xl border border-border">
        <ScrollArea className="h-[340px] p-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-text font-normal">
            {doc.body}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-start gap-3 p-4 bg-teal/5 rounded-xl border border-teal/20">
        <Checkbox
          id="nc-agree"
          checked={agreed}
          onCheckedChange={setAgreed}
          className="mt-0.5"
        />
        <label htmlFor="nc-agree" className="text-sm text-navy font-medium cursor-pointer leading-relaxed">
          I have read, understood, and agree to the terms of this Non-Compete Agreement. I understand that violation of these terms may result in termination and legal action.
        </label>
      </div>

      <div className="flex justify-between pt-2">
        <div />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onDecline} className="border-destructive/30 text-destructive hover:bg-destructive/5">
            Decline
          </Button>
          <GradientButton onClick={onAccept} disabled={!agreed} className="px-10">
            Accept & Submit
          </GradientButton>
        </div>
      </div>
    </div>
  );
}