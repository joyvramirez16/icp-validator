// app/page.jsx - Main page
'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function Home() {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleScrapeProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setProfileData(null);
    setResult(null);

    try {
      if (!linkedinUrl.includes('linkedin.com')) {
        throw new Error('Invalid LinkedIn URL');
      }

      const response = await fetch('/api/scrape-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkedinUrl })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to scrape profile');

      setProfileData(data);
      evaluateProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const evaluateProfile = (profile) => {
    const checks = {
      location: {
        passed: ['USA', 'CANADA'].some(loc => profile.location?.toUpperCase().includes(loc)),
        criterion: 'Location: USA or Canada',
        value: profile.location || 'Unknown'
      },
      jobTitle: {
        passed: ['CEO', 'PRESIDENT', 'VP', 'HEAD OF', 'CHIEF', 'DIRECTOR', 'SVP'].some(title =>
          profile.position?.toUpperCase().includes(title)
        ) && !['INSTRUCTIONAL', 'COORDINATOR', 'ASSISTANT'].some(exclude =>
          profile.position?.toUpperCase().includes(exclude)
        ),
        criterion: 'Senior L&D/Leadership role',
        value: profile.position || 'Unknown'
      },
      companySize: {
        passed: profile.companySize && profile.companySize >= 150 && profile.companySize <= 1000,
        criterion: 'Company headcount: 150-1,000',
        value: profile.companySize ? `${profile.companySize} employees` : 'Unknown'
      },
      companyMaturity: {
        passed: profile.companySize ? profile.companySize >= 150 : false,
        criterion: 'Established/mature organization',
        value: profile.company || 'Unknown'
      }
    };

    const allPassed = Object.values(checks).every(c => c.passed);
    const icpResult = {
      ...profile,
      dateEvaluated: new Date().toLocaleDateString(),
      icpStatus: allPassed ? 'ICP' : 'NOT ICP',
      checks,
      passedChecks: Object.values(checks).filter(c => c.passed).length,
      totalChecks: Object.keys(checks).length
    };
    setResult(icpResult);
  };

  const handleSaveToGDoc = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const response = await fetch('/api/save-to-gdoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert(`✓ Saved to Google Sheets!`);
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-4 md:p-8">
      <div className="max-w-2xl mx-auto mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">ICP Validator</h1>
        <p className="text-blue-100 text-lg">Evaluate LinkedIn profiles in seconds</p>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-white border-b-2 border-gray-200">
          <form onSubmit={handleScrapeProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">LinkedIn Profile URL</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/john-doe"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-base"
                required
              />
              <p className="text-xs text-gray-500 mt-2">Paste any LinkedIn profile URL</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Profile...
                </>
              ) : (
                '🔍 Analyze Profile'
              )}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div><p className="font-semibold text-red-900">Error</p><p className="text-sm text-red-700">{error}</p></div>
            </div>
          )}
        </div>

        {result && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Evaluation Result</h2>
              <div className={`px-6 py-3 rounded-lg font-bold text-lg ${result.icpStatus === 'ICP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{result.icpStatus}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div><p className="text-xs font-semibold text-gray-600 uppercase">Name</p><p className="text-lg font-semibold text-gray-900">{result.name || 'N/A'}</p></div>
              <div><p className="text-xs font-semibold text-gray-600 uppercase">Position</p><p className="text-lg font-semibold text-gray-900">{result.position || 'N/A'}</p></div>
              <div><p className="text-xs font-semibold text-gray-600 uppercase">Company</p><p className="text-lg font-semibold text-gray-900">{result.company || 'N/A'}</p></div>
              <div><p className="text-xs font-semibold text-gray-600 uppercase">Evaluated</p><p className="text-lg font-semibold text-gray-900">{result.dateEvaluated}</p></div>
            </div>

            <div>
              <h3 className="font-bold text-lg text-gray-900