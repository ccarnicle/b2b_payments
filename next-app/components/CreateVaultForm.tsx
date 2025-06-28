// Example structure for your CreateVaultForm.tsx component
"use client";

import { useState } from "react";
import { PinataSDK } from "pinata"; // We need the SDK on the client too!

// Initialize the SDK on the client side without any secrets
const pinata = new PinataSDK({});

export function CreateVaultForm() {
  const [vaultName, setVaultName] = useState("");
  const [terms, setTerms] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!vaultName || !terms) {
      alert("Please fill out all fields.");
      return;
    }

    setIsUploading(true);

    try {
      // STEP 1: Get the temporary signed URL from our backend API route
      console.log("Requesting signed URL from backend...");
      const urlRequest = await fetch("/api/generate-upload-url");
      const { url: signedUrl } = await urlRequest.json();
      if (!signedUrl) {
        throw new Error("Could not get signed URL from server.");
      }
      console.log("Received signed URL.");

      // STEP 2: Create a 'File' object in memory from our JSON data
      const vaultData = { name: vaultName, terms: terms };
      const dataString = JSON.stringify(vaultData);
      const jsonFile = new File([dataString], "vault-terms.json", {
        type: "application/json",
      });

      // STEP 3: Use the Pinata SDK on the client to upload the file to the signed URL
      console.log("Uploading JSON file to Pinata via signed URL...");
      const uploadResult = await pinata.upload.public
        .file(jsonFile)
        .url(signedUrl);
      
      const cid = uploadResult.cid;
      console.log("Upload successful! CID:", cid);

      // --------------------------------------------------------------------
      // SUCCESS! WE HAVE THE CID. NOW WE CAN CALL THE SMART CONTRACT.
      // This is where the Day 4/5 logic will go.
      // Example:
      // const provider = ... get provider from Privy ...
      // const signer = ... get signer ...
      // const contract = new Contract(VAULT_FACTORY_ADDRESS, VAULT_FACTORY_ABI, signer);
      // const tx = await contract.createVault(..., ..., cid);
      // await tx.wait();
      // alert(`Vault created with CID: ${cid}`);
      // --------------------------------------------------------------------

    } catch (e) {
      console.error(e);
      alert("An error occurred during upload or contract creation.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your input fields for vaultName, terms, etc. */}
      <input 
        type="text" 
        value={vaultName} 
        onChange={(e) => setVaultName(e.target.value)} 
        placeholder="Vault Name" 
      />
      <textarea 
        value={terms} 
        onChange={(e) => setTerms(e.target.value)} 
        placeholder="Milestone Terms"
      />
      <button type="submit" disabled={isUploading}>
        {isUploading ? "Processing..." : "Create Vault"}
      </button>
    </form>
  );
}