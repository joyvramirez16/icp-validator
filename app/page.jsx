'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function Home() {
  const [deviceMode, setDeviceMode] = useState(null);
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