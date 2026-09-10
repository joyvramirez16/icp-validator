import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const result = await request.json();

    const docContent = formatResultForDoc(result);

    const response = {
      success: true,
      docName: 'VLL_ICP_Validator_Tracker',
      formattedContent: docContent,
      instructions: 'Copy the formatted content to your Google Doc'
    };

    console.log('ICP Evaluation Saved:', result);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save' },
      { status: 500 }
    );
  }
}

function formatResultForDoc(result) {
  const timestamp = new Date().toLocaleString();
  const checksText = Object.entries(result.checks)
    .map(([key, check]) => `${check.passed ? '✓' : '✗'} ${check.criterion}: ${check.value}`)
    .join('\n');

  return `
[${timestamp}] ICP EVALUATION RESULT
===============================================
Name: ${result.name || 'N/A'}
Position: ${result.position || 'N/A'}
Company: ${result.company || 'N/A'}
Location: ${result.location || 'N/A'}
LinkedIn: ${result.linkedinUrl || 'N/A'}

ICP STATUS: ${result.icpStatus}
Criteria Passed: ${result.passedChecks}/${result.totalChecks}

EVALUATION:
${checksText}

===============================================
`;
}
