import CreateVaultForm from "@/components/CreateVaultForm";

export default function CreatePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-4xl font-bold font-display">Create a New Pact</h1>
        <p className="text-sm md:text-base text-foreground/80 mt-2 max-w-2xl mx-auto">
          Prize Pool pacts distribute funds to multiple recipients after a set time, while Milestone pacts release payments from one funder to one grantee as milestones are completed.
        </p>
      </div>
      <CreateVaultForm />
    </div>
  );
}