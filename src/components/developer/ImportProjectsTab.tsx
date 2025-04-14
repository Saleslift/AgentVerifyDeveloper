import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  FileText
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ImportProjectsTab() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importTokens, setImportTokens] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'generating' | 'importing' | 'complete' | 'error'>('idle');
  const [importResults, setImportResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errorMessages: string[];
  }>({
    total: 0,
    successful: 0,
    failed: 0,
    errorMessages: []
  });
  const [tokenToUse, setTokenToUse] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchImportTokens();
    }
  }, [user]);

  const fetchImportTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('import_tokens')
        .select('*')
        .eq('developer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setImportTokens(data || []);
    } catch (error) {
      console.error('Error fetching import tokens:', error);
      toast.error('Failed to load import tokens');
    }
  };

  const generateImportToken = async (projectCount: number) => {
    try {
      setImportStatus('generating');
      
      const { data, error } = await supabase.rpc('generate_import_token', {
        p_developer_id: user?.id,
        p_project_count: projectCount
      });
      
      if (error) throw error;
      
      toast.success(`Import token generated successfully`);
      await fetchImportTokens();
      setTokenToUse(data);
    } catch (error) {
      console.error('Error generating import token:', error);
      toast.error('Failed to generate import token');
      setImportStatus('error');
    } finally {
      setImportStatus('idle');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '.xls',
      '.xlsx'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size should not exceed 10MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setFile(selectedFile);
    readExcelFile(selectedFile);
  };

  const readExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          toast.error('Error reading file');
          return;
        }
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        // Show preview of first 5 rows
        setPreviewData(jsonData.slice(0, 5));
        
        // Show total count
        if (jsonData.length > 0) {
          toast.success(`File loaded with ${jsonData.length} projects`);
          
          // Check if we need to generate a token
          const availableToken = importTokens.find(token => 
            token.project_count >= jsonData.length && 
            !token.used_at &&
            new Date(token.expires_at) > new Date()
          );
          
          if (availableToken) {
            setTokenToUse(availableToken.id);
            toast.success(`Using existing import token with ${availableToken.project_count} projects capacity`);
          } else {
            // Suggest generating a new token
            toast.error(`No valid import token found for ${jsonData.length} projects. Please generate a new token.`);
          }
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file. Please make sure it\'s a valid Excel document.');
        setPreviewData(null);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      toast.error('Error reading file');
      setPreviewData(null);
      setFile(null);
    };
    
    reader.readAsBinaryString(file);
  };

  const resetFileSelection = () => {
    setFile(null);
    setPreviewData(null);
    setUploadProgress(0);
    setImportStatus('idle');
    setImportResults({
      total: 0,
      successful: 0,
      failed: 0,
      errorMessages: []
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processExcelData = async () => {
    if (!file || !tokenToUse) {
      toast.error('Please select a file and generate an import token');
      return;
    }

    setIsUploading(true);
    setImportStatus('importing');
    setUploadProgress(0);
    setImportResults({
      total: 0,
      successful: 0,
      failed: 0,
      errorMessages: []
    });

    try {
      // Read the Excel file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error('Error reading file');
          }
          
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          if (jsonData.length === 0) {
            throw new Error('No data found in the Excel file');
          }
          
          // Process each row
          const total = jsonData.length;
          let successful = 0;
          let failed = 0;
          const errorMessages: string[] = [];
          
          for (let i = 0; i < total; i++) {
            try {
              const row = jsonData[i] as any;
              
              // Check required fields
              if (!row.project_name || !row.location) {
                throw new Error(`Row ${i+1}: Missing required fields (project_name or location)`);
              }

              // Map Excel row to property structure
              const propertyData = {
                title: row.project_name,
                description: row.description || '',
                location: row.location,
                price: parseFloat(row.price_start) || 0,
                type: 'Apartment', // Default
                contract_type: 'Sale', // Default
                agent_id: user?.id,
                creator_id: user?.id,
                creator_type: 'developer',
                payment_plan: row.payment_plan || null,
                handover_date: row.handover_date || null,
                amenities: row.amenities ? row.amenities.split(',').map((a: string) => a.trim()) : [],
                unit_types: row.unit_type ? row.unit_type.split(',').map((t: string) => t.trim()) : [],
                size_range_min: row.size_range ? parseInt(row.size_range.split('-')[0]) : null,
                size_range_max: row.size_range ? parseInt(row.size_range.split('-')[1] || row.size_range.split('-')[0]) : null,
                status: 'draft',
                import_token: tokenToUse
              };
              
              // Insert property
              const { error: insertError } = await supabase
                .from('properties')
                .insert(propertyData);
              
              if (insertError) throw insertError;
              
              successful++;
            } catch (rowError) {
              failed++;
              const errorMessage = rowError instanceof Error ? rowError.message : String(rowError);
              errorMessages.push(errorMessage);
              console.error(`Error importing row ${i+1}:`, rowError);
            }
            
            // Update progress
            const progress = Math.round(((i + 1) / total) * 100);
            setUploadProgress(progress);
          }
          
          // Mark token as used
          await supabase
            .from('import_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', tokenToUse);
          
          // Update results
          setImportResults({
            total,
            successful,
            failed,
            errorMessages
          });
          
          setImportStatus('complete');
          
          if (successful === total) {
            toast.success(`Successfully imported all ${total} projects`);
          } else {
            toast.success(`Imported ${successful} out of ${total} projects`);
          }
          
          // Refresh token list
          fetchImportTokens();
          
        } catch (error) {
          console.error('Error processing Excel data:', error);
          setImportStatus('error');
          toast.error('Error processing Excel data');
        }
      };
      
      reader.onerror = () => {
        setImportStatus('error');
        toast.error('Error reading file');
      };
      
      reader.readAsBinaryString(file);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setImportStatus('error');
      toast.error('Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { data, error } = await supabase.rpc('get_project_import_template');
      
      if (error) throw error;
      
      // Create workbook with template
      const wb = XLSX.utils.book_new();
      
      // Create worksheet with headers
      const ws = XLSX.utils.json_to_sheet([data.example_row], { 
        header: data.headers 
      });
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Project Import Template');
      
      // Generate Excel file
      XLSX.writeFile(wb, 'project_import_template.xlsx');
      
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Import Projects</h3>
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h4 className="text-lg font-medium mb-4">Upload Project Data</h4>
        
        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Excel File (.xlsx)
          </label>
          
          {!file ? (
            <label className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
              <span className="flex flex-col items-center justify-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="font-medium text-gray-600">
                  Drag and drop or click to upload
                </span>
                <span className="text-xs text-gray-500">
                  Excel file up to 10MB
                </span>
              </span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
            </label>
          ) : (
            <div className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-md">
              <FileSpreadsheet className="h-8 w-8 text-green-500 mr-3" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={resetFileSelection}
                className="p-1 bg-gray-200 rounded-full hover:bg-gray-300"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Import Tokens */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h5 className="text-base font-medium">Import Tokens</h5>
            <div className="flex space-x-2">
              <button
                onClick={() => generateImportToken(10)}
                className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                disabled={importStatus === 'generating'}
              >
                Generate 10
              </button>
              <button
                onClick={() => generateImportToken(50)}
                className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                disabled={importStatus === 'generating'}
              >
                Generate 50
              </button>
              <button
                onClick={() => generateImportToken(100)}
                className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                disabled={importStatus === 'generating'}
              >
                Generate 100
              </button>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Count
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importStatus === 'generating' ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-gray-400 animate-spin mr-2" />
                        <span>Generating token...</span>
                      </div>
                    </td>
                  </tr>
                ) : importTokens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                      No import tokens found. Generate a token to import projects.
                    </td>
                  </tr>
                ) : (
                  importTokens.map(token => {
                    const isExpired = new Date(token.expires_at) < new Date();
                    const isUsed = !!token.used_at;
                    const isSelected = token.id === tokenToUse;
                    
                    return (
                      <tr key={token.id} className={isSelected ? "bg-green-50" : ""}>
                        <td className="px-4 py-2 text-sm font-mono">
                          {token.id.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {token.project_count}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {new Date(token.expires_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {isUsed ? (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                              Used
                            </span>
                          ) : isExpired ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Valid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {!isUsed && !isExpired && (
                            <button
                              onClick={() => setTokenToUse(token.id)}
                              className={`px-2 py-1 text-xs rounded ${
                                isSelected 
                                  ? "bg-green-600 text-white" 
                                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <HelpCircle className="h-3 w-3 mr-1" />
            <span>Import tokens are single-use and expire after 24 hours</span>
          </div>
        </div>

        {/* Data Preview */}
        {previewData && previewData.length > 0 && (
          <div className="mb-6">
            <h5 className="text-base font-medium mb-3">Data Preview</h5>
            <div className="border border-gray-200 rounded-md overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {Object.values(row).map((cell: any, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 text-sm">
                          {String(cell).substring(0, 50)}
                          {String(cell).length > 50 ? '...' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.length < 5 && (
              <p className="mt-2 text-xs text-gray-500 italic">
                Showing all {previewData.length} rows
              </p>
            )}
            {previewData.length === 5 && (
              <p className="mt-2 text-xs text-gray-500 italic">
                Showing first 5 rows of the file
              </p>
            )}
          </div>
        )}

        {/* Import Progress */}
        {importStatus === 'importing' && (
          <div className="mb-6">
            <h5 className="text-base font-medium mb-3">Import Progress</h5>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">
              {uploadProgress}% complete
            </p>
          </div>
        )}

        {/* Import Results */}
        {importStatus === 'complete' && (
          <div className="mb-6">
            <h5 className="text-base font-medium mb-3">Import Results</h5>
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <div className="flex">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
                <div className="ml-3">
                  <p className="text-green-700">
                    Successfully imported {importResults.successful} out of {importResults.total} projects
                  </p>
                  {importResults.failed > 0 && (
                    <p className="text-yellow-700 mt-1">
                      Failed to import {importResults.failed} projects
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {importResults.failed > 0 && importResults.errorMessages.length > 0 && (
              <div className="border border-gray-200 rounded-md">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h6 className="font-medium">Error Details</h6>
                </div>
                <div className="p-4 max-h-40 overflow-y-auto">
                  <ul className="list-disc pl-5 space-y-1">
                    {importResults.errorMessages.map((message, index) => (
                      <li key={index} className="text-sm text-red-600">
                        {message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Error */}
        {importStatus === 'error' && (
          <div className="mb-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <div className="ml-3">
                  <p className="text-red-700">
                    An error occurred during the import process. Please try again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Instructions */}
        <div className="mt-6 bg-gray-50 p-4 rounded-md">
          <h5 className="text-base font-medium mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2 text-gray-500" />
            Import Instructions
          </h5>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            <li>Download the template Excel file using the button above</li>
            <li>Fill in your project data following the format in the template</li>
            <li>Generate an import token with enough capacity for your projects</li>
            <li>Upload your completed Excel file</li>
            <li>Review the data preview to ensure it's correct</li>
            <li>Click "Start Import" to begin the import process</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800">
            <strong>Note:</strong> Projects imported through this tool will be created in draft status. 
            You'll need to review and publish them after import.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={resetFileSelection}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 mr-4"
          >
            Reset
          </button>
          <button
            onClick={processExcelData}
            disabled={!file || !tokenToUse || importStatus === 'importing' || importStatus === 'generating'}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center"
          >
            {importStatus === 'importing' ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Start Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}