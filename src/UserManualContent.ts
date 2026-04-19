export const USER_MANUAL_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FREDAsoft - User Manual</title>
    <style>
        body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        h1 { font-size: 2.5rem; border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 40px; }
        h2 { font-size: 1.8rem; color: #333; margin-top: 30px; border-left: 4px solid #000; padding-left: 15px; }
        h3 { font-size: 1.3rem; color: #555; margin-top: 20px; }
        p { margin-bottom: 15px; }
        ul, ol { margin-bottom: 20px; padding-left: 25px; }
        li { margin-bottom: 8px; }
        .note { background: #f4f4f5; border-radius: 8px; padding: 15px; border-left: 4px solid #71717a; margin: 20px 0; font-style: italic; }
        .step { font-weight: bold; color: #000; }
        .screenshot-placeholder { background: #e4e4e7; border: 2px dashed #a1a1aa; border-radius: 12px; height: 200px; display: flex; items-center: center; justify-content: center; color: #71717a; margin: 20px 0; font-size: 0.9rem; text-align: center; padding: 20px; }
        code { background: #f1f1f1; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <h1>FREDAsoft User Manual</h1>
    <p>Welcome to FREDAsoft. This manual is designed to guide you through the "Golden Path" of setting up and performing field inspections using our professional data entry tool.</p>

    <h2>1. Getting Started: The Golden Path</h2>
    <p>The Golden Path represents the most efficient way to use the system, from initial setup to final data review.</p>
    
    <h3>Step 1: Setting up the Environment (Portfolio Management)</h3>
    <p>Before you can record data, you must define the clients you are serving and the entities associated with them.</p>
    <ul>
        <li><span class="step">Create a Client:</span> Go to the <strong>Portfolio</strong> tab. Click "Add Client" and enter the name of the entity you are serving.</li>
        <li><span class="step">Add Facilities:</span> Facilities are the physical locations (e.g., "Main Street Office Building") owned or managed by the Client.</li>
        <li><span class="step">Create Projects:</span> Projects represent specific inspection tasks or contracts for a Client. 
            <ul>
                <li><strong>Plan Review:</strong> A review of construction documents <em>before</em> construction begins.</li>
                <li><strong>Inspection:</strong> A physical site visit to a building that has already been constructed.</li>
            </ul>
        </li>
    </ul>
    <div class="note">
        <strong>Hierarchy Note:</strong> Facilities and Projects are both direct children of a Client. This allows you to associate multiple facilities with a single project or vice versa during data entry.
    </div>
    <div class="screenshot-placeholder">
        [Screenshot: Portfolio Tab showing a Client with its associated Facilities and Projects]
    </div>

    <h2>2. Managing Your Knowledge (Libraries and Glossaries)</h2>
    <p>The system uses a centralized <strong>Glossary Editor</strong> to manage your technical knowledge.</p>
    <ul>
        <li><span class="step">Glossary Editor:</span> Use this to build and manage your library of common findings and recommendations.
            <ul>
                <li><strong>Categories:</strong> Group your items (e.g., "Parking", "Restrooms").</li>
                <li><strong>Items:</strong> Specific elements within a category (e.g., "Accessible Parking Spaces").</li>
                <li><strong>Findings:</strong> The specific issue observed (e.g., "Slope exceeds 2%").</li>
                <li><strong>Recommendations:</strong> The suggested fix (e.g., "Regrade surface to comply").</li>
                <li><strong>Bulk Actions:</strong> Use the editor for bulk changes, deduplication, or to import a master list from a spreadsheet.</li>
            </ul>
        </li>
    </ul>

    <h2>3. Field Inspection (Project Data Entry)</h2>
    <p>This is where the actual work happens. When you are on-site, use the <strong>Project Data Entry</strong> tab to record your observations.</p>
    <ol>
        <li>Select your <strong>Client</strong>.</li>
        <li>Select the <strong>Project</strong> you are working on and the <strong>Facility</strong> you are currently inspecting.</li>
        <li>Choose a <strong>Location</strong> within the facility (e.g., "North Parking Lot").</li>
        <li>Select a <strong>Category</strong> and <strong>Item</strong> from your Glossary.</li>
        <li>Pick the relevant <strong>Finding</strong>. The system will automatically pull in the associated Recommendation and Unit Cost.</li>
        <li>Enter the <strong>Quantity</strong> and record any specific <strong>Measurements</strong>.</li>
        <li>Click <strong>Save Record</strong> to commit the data.</li>
    </ol>
    <div class="screenshot-placeholder">
        [Screenshot: Project Data Entry form with a Finding selected and measurements entered]
    </div>

    <h2>4. Reviewing and Exporting (Data Explorer)</h2>
    <p>Once data is recorded, use the <strong>Data Explorer</strong> to review everything in a spreadsheet-like view.</p>
    <ul>
        <li>Filter by Client, Project, or Facility to narrow down your view.</li>
        <li>Sort by entry order or category to organize your report.</li>
        <li>Review total costs automatically calculated based on your quantities and unit costs.</li>
    </ul>

    <h2>5. Key Concepts for RAS (Registered Accessibility Specialists)</h2>
    <p>As a RAS in Texas, you are responsible for ensuring compliance with the Texas Accessibility Standards (TAS).</p>
    <ul>
        <li><strong>TDLR Registration:</strong> Ensure your projects are correctly registered with the Texas Department of Licensing and Regulation.</li>
        <li><strong>Plan Review vs. Inspection:</strong> Remember that a Plan Review is a prerequisite for most Inspection projects.</li>
    </ul>

    <div class="note">
        For technical support or feature requests, please contact the system administrator.
    </div>
</body>
</html>
`;
