import CreatePoolForm from "@/components/CreatePoolForm";

export default function CreatePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Create a New Prize Pool</h1>
        <p className="text-foreground/80 mt-2">
          Fill out the details below to launch your new escrow contract.
        </p>
      </div>
      <CreatePoolForm />
    </div>
  );
}