import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../store/hooks";
import { connectToTuition } from "../store/slices/authSlice";

export default function TuitionProfileSetup({ onSuccess }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [feeStructure, setFeeStructure] = useState([{ standard: "", amount: "" }]);
  // const [subjects, setSubjects] = useState(""); // removed per request
  const [languages, setLanguages] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feeError, setFeeError] = useState("");

  // Prevent duplicate standards
  const isDuplicateStandard = (arr = feeStructure) => {
    const stds = arr.map(row => row.standard.trim().toLowerCase()).filter(Boolean);
    return new Set(stds).size !== stds.length;
  };

  // Handle fee structure rows
  const handleFeeChange = (idx, field, value) => {
    const updated = feeStructure.map((row, i) =>
      i === idx ? { ...row, [field]: value } : row
    );
    setFeeStructure(updated);
    // Real-time duplicate check
    if (isDuplicateStandard(updated)) {
      setFeeError("Duplicate standards are not allowed.");
    } else {
      setFeeError("");
    }
  };

  const addFeeRow = () => setFeeStructure([...feeStructure, { standard: "", amount: "" }]);
  const removeFeeRow = (idx) => {
    const updated = feeStructure.filter((_, i) => i !== idx);
    setFeeStructure(updated);
    if (isDuplicateStandard(updated)) {
      setFeeError("Duplicate standards are not allowed.");
    } else {
      setFeeError("");
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFeeError("");

    // Validation
    if (feeStructure.some(row => !row.standard.trim() || !row.amount)) {
      setFeeError("Please fill all standard and amount fields.");
      setLoading(false);
      return;
    }
    if (isDuplicateStandard()) {
      setFeeError("Duplicate standards are not allowed.");
      setLoading(false);
      return;
    }

    const standards = feeStructure.map(row => row.standard.trim());
    const fees_structure = feeStructure.map(row => ({ standard: row.standard.trim(), amount: Number(row.amount) }));

    // GraphQL mutation
    const mutation = `
      mutation CreateTuition($input: TuitionInput!) {
        createTuition(input: $input) {
          id
          name
        }
      }
    `;
    const variables = {
      input: {
        name,
        address,
        contact_info: contact,
        standards,
        fees_structure
      }
    };

    try {
      const res = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ query: mutation, variables })
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      
      // Persist languages locally for now (not part of API schema yet)
      try {
        if (languages.trim()) {
          localStorage.setItem('tuition_languages', languages.trim());
        }
      } catch (_) {}

      // Connect user to the newly created tuition
      dispatch(connectToTuition({
        tuitionId: data.data.createTuition.id,
        role: 'owner' // User becomes owner of the tuition they create
      }));
      
      if (onSuccess) onSuccess();
      // After creating tuition, ask to import data or skip
      navigate("/post-setup");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-white dark:bg-[#0b0b0e] px-4">
      <form
        className="w-full max-w-md bg-white dark:bg-[#0e0e12] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-6 py-8 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-bold text-center mb-2 text-black dark:text-gray-100">Setup Your Tuition</h2>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <input
          className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 h-11 bg-white dark:bg-[#0f0f14] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          placeholder="Tuition Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 h-11 bg-white dark:bg-[#0f0f14] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          placeholder="Address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          required
        />
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 h-11 bg-white dark:bg-[#0f0f14] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          placeholder="Email"
          value={contact}
          onChange={e => setContact(e.target.value)}
          required
        />
        <div>
          <label className="block font-semibold mb-1 text-gray-900 dark:text-gray-200">Fee Structure (Standard-wise)</label>
          {feeStructure.map((row, idx) => (
            <div key={idx} className="flex gap-2 mb-1">
              <input
                className="w-1/2 border border-gray-300 dark:border-gray-700 rounded px-3 h-11 bg-white dark:bg-[#0f0f14] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
                type="text"
                placeholder="Standard (e.g. 8th, 9th, LKG)"
                value={row.standard}
                onChange={e => handleFeeChange(idx, "standard", e.target.value)}
                required
              />
              <input
                className="w-1/2 border border-gray-300 dark:border-gray-700 rounded px-3 h-11 bg-white dark:bg-[#0f0f14] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
                type="number"
                placeholder="Fees"
                value={row.amount}
                onChange={e => handleFeeChange(idx, "amount", e.target.value)}
                required
              />
              {feeStructure.length > 1 && (
                <button type="button" onClick={() => removeFeeRow(idx)} className="text-red-500">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addFeeRow} className="text-blue-500 dark:text-blue-400 text-sm mt-1">+ Add Row</button>
          {feeError && <div className="text-red-500 text-xs mt-1">{feeError}</div>}
        </div>
        {/* Subjects removed as requested */}
        <input
          className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 h-11 bg-white dark:bg-[#0f0f14] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          placeholder="Languages taught (e.g. Hindi, English, Gujarati)"
          value={languages}
          onChange={e => setLanguages(e.target.value)}
        />
        <button
          type="submit"
          className="bg-black text-white py-2 rounded font-semibold mt-2"
          disabled={loading || !!feeError}
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}