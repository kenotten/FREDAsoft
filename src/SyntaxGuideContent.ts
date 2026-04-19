export const SYNTAX_GUIDE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FREDAsoft - Syntax & Style Guide</title>
    <style>
        body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        h1 { font-size: 2.5rem; border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 40px; }
        h2 { font-size: 1.8rem; color: #333; margin-top: 30px; border-left: 4px solid #000; padding-left: 15px; }
        h3 { font-size: 1.3rem; color: #555; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e4e4e7; padding: 12px; text-align: left; }
        th { background: #f8f8f8; font-weight: bold; }
        .example-box { background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e4e4e7; }
        .correct { color: #059669; font-weight: bold; }
        .incorrect { color: #dc2626; text-decoration: line-through; opacity: 0.7; }
        .syntax-template { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; padding: 15px; border-radius: 8px; font-size: 0.9rem; }
        .syntax-var { color: #fbbf24; }
    </style>
</head>
<body>
    <h1>Syntax & Style Guide</h1>
    <p>This guide establishes the standard language and structure for findings and recommendations within FREDAsoft. Consistency is critical for professional, legally-defensible reports.</p>

    <h2>1. Finding Syntax</h2>
    <p>Every <strong>Long Finding</strong> must follow this structural template:</p>
    <div class="syntax-template">
        <span class="syntax-var">[Subject/Element]</span> + <span class="syntax-var">[Observed Condition]</span> + <span class="syntax-var">[Specific Measurement]</span> + <span class="syntax-var">[Standard Reference]</span>
    </div>
    <div class="example-box">
        <strong>Example:</strong> "The <span class="correct">Grab Bar</span> at the <span class="correct">Water Closet</span> is mounted <span class="correct">36 inches</span> above the finished floor, which exceeds the maximum allowable height per <span class="correct">TAS 609.4</span>."
    </div>

    <h2>2. Recommendation Syntax</h2>
    <p>Every <strong>Long Recommendation</strong> must follow this structural template:</p>
    <div class="syntax-template">
        <span class="syntax-var">[Action Verb]</span> + <span class="syntax-var">[Subject/Element]</span> + <span class="syntax-var">[Required Specification]</span> + <span class="syntax-var">[Compliance Goal]</span>
    </div>
    <div class="example-box">
        <strong>Example:</strong> "<span class="correct">Relocate</span> the <span class="correct">Grab Bar</span> to be mounted between <span class="correct">33 inches</span> and <span class="correct">36 inches</span> above the finished floor to comply with <span class="correct">TAS 609.4</span>."
    </div>

    <h2>3. General Style Rules</h2>
    <table>
        <thead>
            <tr>
                <th>Rule Category</th>
                <th>Rule Description</th>
                <th>Correct Example</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Units of Measure</strong></td>
                <td>Always use full words instead of symbols (", ', #).</td>
                <td><span class="correct">36 inches</span></td>
            </tr>
            <tr>
                <td><strong>Capitalization</strong></td>
                <td>Capitalize <strong>Categories</strong> and <strong>Items</strong> when used as proper nouns.</td>
                <td>the <span class="correct">Restroom Sign</span></td>
            </tr>
            <tr>
                <td><strong>Fractions/Decimals</strong></td>
                <td>Use decimals for precision (slopes) and fractions for hardware.</td>
                <td><span class="correct">8.3% slope</span></td>
            </tr>
            <tr>
                <td><strong>References</strong></td>
                <td>Always lead with the specific TAS/ADA section number.</td>
                <td>per <span class="correct">TAS 404.2.3</span></td>
            </tr>
            <tr>
                <td><strong>Tone</strong></td>
                <td>Use objective, third-person technical language.</td>
                <td><span class="correct">The Countertop was observed...</span></td>
            </tr>
        </tbody>
    </table>

    <h2>4. Standard Action Verbs</h2>
    <p>To maintain professional tone, use these specific verbs for recommendations:</p>
    <ul>
        <li><strong>Relocate:</strong> Move an existing element to a new position.</li>
        <li><strong>Adjust:</strong> Modify the setting or position of an existing element (e.g., door closer).</li>
        <li><strong>Install:</strong> Add a new element that is currently missing.</li>
        <li><strong>Replace:</strong> Remove an existing element and install a new one.</li>
        <li><strong>Provide:</strong> General term for ensuring an element is present and compliant.</li>
    </ul>

    <div class="example-box" style="border-left: 4px solid #000;">
        <strong>Note:</strong> Avoid vague language like "Fix", "Make better", or "Repair" unless followed by specific technical instructions.
    </div>
</body>
</html>
`;
