// Batch utilities for Phase 2 implementation
// Implements: batch code generator, weight calculator, handover sheet generator, QR code generation

const QRCode = require('qrcode');

/**
 * Generate a unique batch code
 * Format: PRJ-{projectCode}-SKU-{skuCode}-{YYYYMMDD}-{seq}
 */
function generateBatchCode(projectCode, skuCode, sequenceNumber) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(sequenceNumber).padStart(3, '0');
  return `PRJ-${projectCode}-SKU-${skuCode}-${date}-${seq}`;
}

/**
 * Calculate quantity from weight
 * Returns: { calculatedQty, method: 'weighed' }
 */
function calculateQuantityFromWeight(totalWeight, containerWeight, unitWeight) {
  if (typeof totalWeight !== 'number' || typeof containerWeight !== 'number' || typeof unitWeight !== 'number' || unitWeight === 0) {
    throw new Error('Invalid weight parameters');
  }
  const calculatedQty = Math.round((totalWeight - containerWeight) / unitWeight);
  return { calculatedQty, method: 'weighed' };
}

/**
 * Generate QR code for batch
 * Returns: Base64 data URL that can be displayed directly in <img> tags
 * 
 * @param {string} batchId - Batch database ID
 * @param {string} batchCode - Human-readable batch code
 * @returns {Promise<string>} Base64 data URL
 */
async function generateBatchQRCode(batchId, batchCode) {
  try {
    // Embed batch data in QR code
    const qrData = JSON.stringify({
      type: 'batch',
      id: batchId,
      code: batchCode,
      timestamp: new Date().toISOString()
    });

    // Generate QR code as data URL (base64)
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer (for serving as image file)
 * 
 * @param {string} batchId - Batch database ID
 * @param {string} batchCode - Human-readable batch code
 * @param {number} size - QR code size in pixels (default: 300)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateBatchQRCodeBuffer(batchId, batchCode, size = 300) {
  try {
    const qrData = JSON.stringify({
      type: 'batch',
      id: batchId,
      code: batchCode,
      timestamp: new Date().toISOString()
    });

    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeBuffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

/**
 * Parse QR code data
 * Validates and extracts batch information from scanned QR code
 * 
 * @param {string} qrDataString - JSON string from scanned QR code
 * @returns {object} Parsed batch data
 */
function parseBatchQRCode(qrDataString) {
  try {
    const data = JSON.parse(qrDataString);
    
    if (data.type !== 'batch') {
      throw new Error('Invalid QR code type');
    }
    
    if (!data.id || !data.code) {
      throw new Error('Missing required batch information');
    }
    
    return {
      batchId: data.id,
      batchCode: data.code,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error parsing QR code:', error);
    throw new Error('Invalid batch QR code data');
  }
}

/**
 * Generate HTML handover sheet for printing
 * Contains: QR code, batch info, tracking history, split/rework/reject data
 * Returns: HTML string ready for printing
 */
function generateHandoverSheet(batch, movements = [], qrCodeDataURL = null) {
  const currentDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const completionPercent = batch.targetQty > 0 
    ? ((batch.currentQty / batch.targetQty) * 100).toFixed(1) 
    : 0;

  // Get latest movement for from/to stations
  const latestMovement = movements.length > 0 ? movements[0] : null;
  const fromStation = latestMovement?.Station_BatchMovement_fromStationIdToStation?.name || 'N/A';
  const toStation = batch.Station?.name || 'N/A';

  // Build sub-batches section if available
  let subBatchesHtml = '';
  if (batch.subBatches && batch.subBatches.length > 0) {
    subBatchesHtml = `
      <div class="section">
        <h3>Sub-Batches (Split Trays)</h3>
        <table>
          <thead>
            <tr>
              <th>Sub-Batch Code</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Current Station</th>
            </tr>
          </thead>
          <tbody>
            ${batch.subBatches.map(sub => `
              <tr>
                <td>${sub.batchCode}</td>
                <td>${sub.currentQty}</td>
                <td>${sub.status}</td>
                <td>${sub.Station?.name || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Build parent batch section if this is a sub-batch
  let parentBatchHtml = '';
  if (batch.parentBatch) {
    parentBatchHtml = `
      <div class="section">
        <h3>Parent Batch</h3>
        <p><strong>Code:</strong> ${batch.parentBatch.batchCode}</p>
        <p><strong>Status:</strong> ${batch.parentBatch.status}</p>
      </div>
    `;
  }

  // Build movement history
  let movementHistoryHtml = '';
  if (movements.length > 0) {
    movementHistoryHtml = `
      <div class="section">
        <h3>Movement History</h3>
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>From</th>
              <th>To</th>
              <th>Qty</th>
              <th>Condition</th>
              <th>Operator</th>
            </tr>
          </thead>
          <tbody>
            ${movements.slice(0, 10).map(m => `
              <tr>
                <td>${new Date(m.timestamp).toLocaleString()}</td>
                <td>${m.Station_BatchMovement_fromStationIdToStation?.name || 'Start'}</td>
                <td>${m.Station_BatchMovement_toStationIdToStation?.name || 'N/A'}</td>
                <td>${m.qty}</td>
                <td class="condition-${m.condition}">${m.condition}</td>
                <td>${m.operatorId}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Batch Handover Sheet - ${batch.batchCode}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #000;
          background: #fff;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #000;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: 24pt;
          margin-bottom: 5px;
        }
        
        .header p {
          font-size: 10pt;
          color: #555;
        }
        
        .qr-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding: 15px;
          border: 2px solid #000;
          background: #f9f9f9;
        }
        
        .qr-code {
          text-align: center;
        }
        
        .qr-code img {
          width: 150px;
          height: 150px;
          border: 2px solid #000;
          padding: 5px;
          background: #fff;
        }
        
        .batch-info {
          flex: 1;
          padding-left: 20px;
        }
        
        .batch-info h2 {
          font-size: 18pt;
          margin-bottom: 10px;
          color: #000;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        
        .info-item {
          padding: 5px 0;
        }
        
        .info-item strong {
          display: inline-block;
          width: 120px;
          font-weight: bold;
        }
        
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .section h3 {
          font-size: 14pt;
          border-bottom: 2px solid #000;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #000;
          color: #fff;
          font-weight: bold;
        }
        
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .status-box {
          display: flex;
          justify-content: space-around;
          margin: 15px 0;
          padding: 15px;
          border: 2px solid #000;
          background: #f0f0f0;
        }
        
        .status-item {
          text-align: center;
        }
        
        .status-item .value {
          font-size: 24pt;
          font-weight: bold;
          display: block;
        }
        
        .status-item .label {
          font-size: 10pt;
          color: #555;
        }
        
        .status-good { color: #28a745; }
        .status-damaged { color: #ffc107; }
        .status-rejected { color: #dc3545; }
        .status-rework { color: #17a2b8; }
        
        .condition-good { background: #d4edda; color: #155724; }
        .condition-damaged { background: #fff3cd; color: #856404; }
        .condition-rejected { background: #f8d7da; color: #721c24; }
        .condition-rework { background: #d1ecf1; color: #0c5460; }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #000;
          text-align: center;
          font-size: 9pt;
          color: #555;
        }
        
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 30px;
          page-break-inside: avoid;
        }
        
        .signature-box {
          border: 1px solid #000;
          padding: 15px;
          min-height: 80px;
        }
        
        .signature-box h4 {
          margin-bottom: 40px;
          font-size: 11pt;
        }
        
        .signature-line {
          border-top: 1px solid #000;
          padding-top: 5px;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>BATCH HANDOVER SHEET</h1>
        <p>Printed: ${currentDate}</p>
      </div>

      <div class="qr-section">
        <div class="qr-code">
          ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="Batch QR Code" />` : '<div style="width:150px;height:150px;border:2px solid #000;display:flex;align-items:center;justify-content:center;">QR Code</div>'}
          <p style="margin-top: 8px; font-weight: bold;">${batch.batchCode}</p>
        </div>
        
        <div class="batch-info">
          <h2>Batch Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>Project:</strong> ${batch.Project?.name || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Project No:</strong> ${batch.Project?.id || 'N/A'}
            </div>
            <div class="info-item">
              <strong>SKU Code:</strong> ${batch.ProjectSku?.skuCode || 'N/A'}
            </div>
            <div class="info-item">
              <strong>SKU Name:</strong> ${batch.ProjectSku?.name || 'N/A'}
            </div>
            <div class="info-item">
              <strong>PO Number:</strong> ${batch.poNumber || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Status:</strong> <strong>${batch.status.toUpperCase()}</strong>
            </div>
            <div class="info-item">
              <strong>From Station:</strong> ${fromStation}
            </div>
            <div class="info-item">
              <strong>To Station:</strong> ${toStation}
            </div>
          </div>
        </div>
      </div>

      <div class="status-box">
        <div class="status-item">
          <span class="value">${batch.targetQty}</span>
          <span class="label">Target Quantity</span>
        </div>
        <div class="status-item">
          <span class="value status-good">${batch.currentQty}</span>
          <span class="label">Current Quantity</span>
        </div>
        <div class="status-item">
          <span class="value status-rejected">${batch.rejectedQty || 0}</span>
          <span class="label">Rejected</span>
        </div>
        <div class="status-item">
          <span class="value">${completionPercent}%</span>
          <span class="label">Completion</span>
        </div>
      </div>

      ${parentBatchHtml}
      ${subBatchesHtml}
      ${movementHistoryHtml}

      <div class="signature-section">
        <div class="signature-box">
          <h4>Handed Over By:</h4>
          <div class="signature-line">
            Name: _______________________<br>
            Date/Time: _______________________<br>
            Signature: _______________________
          </div>
        </div>
        <div class="signature-box">
          <h4>Received By:</h4>
          <div class="signature-line">
            Name: _______________________<br>
            Date/Time: _______________________<br>
            Signature: _______________________
          </div>
        </div>
      </div>

      <div class="footer">
        <p><strong>Pramara PMS - Production Management System</strong></p>
        <p>This document was auto-generated by the system</p>
      </div>

      <script>
        // Auto-print when page loads (optional)
        // window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;

  return html;
}

module.exports = {
  generateBatchCode,
  calculateQuantityFromWeight,
  generateBatchQRCode,
  generateBatchQRCodeBuffer,
  parseBatchQRCode,
  generateHandoverSheet
};
