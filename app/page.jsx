'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function Home() {
  const [deviceMode, setDeviceMode] = useState(null);
  const [inputMode, setInputMode] = useState('manual'); // 'manual' or 'json'
  const [jsonInput, setJsonInput] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // Listen for JSON data from Cowork/Claude in Chrome
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'ICP_PROFILE_DATA') {
        const profileData = event.data.payload;
        evaluateProfileData(profileData);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const parseJsonInput = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (!data.name || !data.position || !data.company || !data.location) {
        setError('Missing required fields: name, position, company, location');
        return null;
      }
      return data;
    } catch (err) {
      setError('Invalid JSON format');
      return null;
    }
  };

  const handleJsonEvaluate = async () => {
    setError('');
    const profileData = parseJsonInput();
    if (!profileData) return;
    
    await evaluateProfileData(profileData);
  };

  const evaluateProfileData = async (profileData) => {
    const checks = {
      location: {
        passed: ['USA', 'CANADA'].some(loc => profileData.location?.toUpperCase().includes(loc)),
        criterion: 'Location: USA or Canada',
        value: profileData.location || 'Unknown'
      },
      jobTitle: {
        passed: ['CEO', 'PRESIDENT', 'VP', 'HEAD OF', 'CHIEF', 'DIRECTOR', 'SVP'].some(title =>
          profileData.position?.toUpperCase().includes(title)
        ) && !['INSTRUCTIONAL', 'COORDINATOR', 'ASSISTANT'].some(exclude =>
          profileData.position?.toUpperCase().includes(exclude)
        ),
        criterion: 'Senior L&D/Leadership role',
        value: profileData.position || 'Unknown'
      },
      companySize: {
        passed: profileData.companySize && profileData.companySize >= 150 && profileData.companySize <= 1000,
        criterion: 'Company headcount: 150-1,000',
        value: profileData.companySize ? `${profileData.companySize} employees` : 'Unknown'
      },
      companyMaturity: {
        passed: profileData.companySize ? profileData.companySize >= 150 : false,
        criterion: 'Established/mature organization',
        value: profileData.company || 'Unknown'
      }
    };

    const allPassed = Object.values(checks).every(c => c.passed);
    const icpResult = {
      ...profileData,
      linkedinUrl: profileData.linkedinUrl || '',
      dateEvaluated: new Date().toLocaleDateString(),
      icpStatus: allPassed ? 'ICP' : 'NOT ICP',
      checks,
      passedChecks: Object.values(checks).filter(c => c.passed).length,
      totalChecks: Object.keys(checks).length
    };
    setResult(icpResult);
    
    // Auto-save to Google Sheets
    await handleSaveToGDoc(icpResult);
  };

  const handleScrapeProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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

      await evaluateProfileData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGDoc = async (resultData) => {
    setSaving(true);
    try {
      const response = await fetch('/api/save-to-gdoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
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

  // Device Selection Screen
  if (!deviceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ICP Validator</h1>
          <p className="text-gray-600 mb-8">Select your device type to optimize the experience</p>
          
          <div className="space-y-4">
            <button
              onClick={() => setDeviceMode('pc')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition text-lg"
            >
              💻 Desktop / PC
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg transition text-lg"
            >
              📱 Mobile / Tablet
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-8">You can change this anytime by refreshing the page</p>
        </div>
      </div>
    );
  }

  const isPc = deviceMode === 'pc';

  return (
    <div className={isPc ? 'p-8' : 'p-4'} style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)' }}>
      <div style={{ maxWidth: isPc ? '900px' : '400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isPc ? '3rem' : '2rem' }}>
          <h1 style={{ fontSize: isPc ? '3rem' : '1.875rem', fontWeight: 'bold', color: 'white', margin: '0 0 0.5rem' }}>ICP Validator</h1>
          <p style={{ fontSize: isPc ? '1.125rem' : '1rem', color: '#e0e7ff', margin: '0 0 1rem' }}>Evaluate LinkedIn profiles in seconds</p>
          <button
            onClick={() => { setDeviceMode(null); setResult(null); setLinkedinUrl(''); setJsonInput(''); setInputMode('manual'); }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
          >
            ← Change device
          </button>
        </div>

        {/* Input Mode Selector */}
        <div style={{ background: 'white', borderRadius: '1rem', padding: isPc ? '2rem' : '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => { setInputMode('manual'); setJsonInput(''); setError(''); }}
            style={{ padding: '0.5rem 1rem', background: inputMode === 'manual' ? '#2563eb' : '#e5e7eb', color: inputMode === 'manual' ? 'white' : '#374151', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
          >
            Manual Input
          </button>
          <button
            onClick={() => { setInputMode('json'); setLinkedinUrl(''); setError(''); }}
            style={{ padding: '0.5rem 1rem', background: inputMode === 'json' ? '#2563eb' : '#e5e7eb', color: inputMode === 'json' ? 'white' : '#374151', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
          >
            JSON Input (Cowork)
          </button>
        </div>

        {/* Main Card */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', overflow: 'hidden', marginBottom: '2rem' }}>
          
          {/* Manual Input */}
          {inputMode === 'manual' && (
            <div style={{ padding: isPc ? '2rem' : '1.5rem', background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <form onSubmit={handleScrapeProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: isPc ? '1rem' : '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>LinkedIn Profile URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/john-doe"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '0.5rem' }}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 1rem' }}>Paste any LinkedIn profile URL or use "test-demo" for demo</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: isPc ? '1rem' : '0.75rem', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: isPc ? '1rem' : '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    '🔍 Analyze Profile'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* JSON Input */}
          {inputMode === 'json' && (
            <div style={{ padding: isPc ? '2rem' : '1.5rem', background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <div>
                <label style={{ display: 'block', fontSize: isPc ? '1rem' : '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Paste JSON Data (from Cowork)</label>
                <textarea
                  placeholder='{"name":"Jane Smith","position":"VP of Learning","company":"Acme Corp","location":"USA","companySize":450,"linkedinUrl":"https://linkedin.com/in/jane-smith"}'
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  style={{ width: '100%', padding: '1rem', border: '2px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box', marginBottom: '1rem', minHeight: '120px', fontFamily: 'monospace' }}
                />
                <button
                  onClick={handleJsonEvaluate}
                  disabled={loading}
                  style={{ width: '100%', background: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: isPc ? '1rem' : '0.75rem', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Evaluating...' : 'Evaluate Profile'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '1rem', background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem', margin: '1rem' }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626', flexShrink: 0 }} />
              <div><p style={{ fontWeight: '600', color: '#991b1b', margin: 0 }}>Error</p><p style={{ fontSize: '0.875rem', color: '#b91c1c', margin: '0.25rem 0 0' }}>{error}</p></div>
            </div>
          )}

          {/* Result Section */}
          {result && (
            <div style={{ padding: isPc ? '2rem' : '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: isPc ? '1.5rem' : '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Evaluation Result</h2>
                <div style={{ background: result.icpStatus === 'ICP' ? '#dcfce7' : '#fee2e2', color: result.icpStatus === 'ICP' ? '#166534' : '#991b1b', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', fontSize: isPc ? '1.125rem' : '1rem' }}>{result.icpStatus}</div>
              </div>

              {/* Profile Info */}
              {isPc ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                  <div><p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Name</p><p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>{result.name || 'N/A'}</p></div>
                  <div><p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Position</p><p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>{result.position || 'N/A'}</p></div>
                  <div><p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Company</p><p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>{result.company || 'N/A'}</p></div>
                  <div><p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Evaluated</p><p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>{result.dateEvaluated}</p></div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                  <div><p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Name</p><p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>{result.name || 'N/A'}</p></div>
                  <div><p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Position</p><p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>{result.position || 'N/A'}</p></div>
                  <div><p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Company</p><p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>{result.company || 'N/A'}</p></div>
                </div>
              )}

              {/* Criteria Check */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: isPc ? '1.125rem' : '1rem', fontWeight: '600', color: '#111827', margin: '0 0 1rem' }}>SOP Criteria Check</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(result.checks).map(([key, check]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid ' + (check.passed ? '#16a34a' : '#dc2626'), background: check.passed ? '#f0fdf4' : '#fef2f2' }}>
                      {check.passed ? (
                        <CheckCircle2 style={{ width: '24px', height: '24px', color: '#16a34a', flexShrink: 0, marginTop: '0.125rem' }} />
                      ) : (
                        <XCircle style={{ width: '24px', height: '24px', color: '#dc2626', flexShrink: 0, marginTop: '0.125rem' }} />
                      )}
                      <div style={{ flex: 1 }}><p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>{check.criterion}</p><p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>{check.value}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Criteria Met */}
              <div style={{ background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem' }}>Criteria Met</p>
                <p style={{ fontSize: isPc ? '2rem' : '1.5rem', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{result.passedChecks}<span style={{ fontSize: isPc ? '1.25rem' : '1rem', color: '#6b7280' }}>/{result.totalChecks}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
          <p style={{ margin: '0 0 0.5rem' }}>Secure • No data stored • Evaluates against VLL SOP criteria</p>
          <p style={{ fontSize: '0.75rem', margin: '0.75rem 0 0' }}>Created by: Masterlabs | 09479984309</p>
          <p style={{ fontSize: '0.75rem', margin: 0 }}>Version 2.26.9.10</p>
        </div>
      </div>
    </div>
  );
}