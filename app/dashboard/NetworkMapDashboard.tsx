"use client"

import { useState } from "react"

export default function AdGeneratorDashboard() {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")

  const generateAd = async () => {
    const res = await fetch("/api/ai/generate-ad", {
      method: "POST",
      body: JSON.stringify({ prompt })
    })

    const data = await res.json()
    setResult(data.text)
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold">AI Ad Generator</h2>

      <textarea
        className="w-full border p-2 mt-3"
        placeholder="Describe the campaign"
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        onClick={generateAd}
        className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Generate Ad
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          {result}
        </div>
      )}
    </div>
  )
}