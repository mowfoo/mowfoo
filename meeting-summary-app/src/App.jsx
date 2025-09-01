import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Globe, AlertCircle, Loader2, RefreshCw, Hash } from 'lucide-react';

const MeetingNotesSummaryApp = () => {
  // Core state management
  const [rawNotes, setRawNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false); // State for fine-tuning
  const [error, setError] = useState('');
  const [currentLocale, setCurrentLocale] = useState('en-US');
  const [elaborateVersion, setElaborateVersion] = useState(false);
  const [qualityCheck, setQualityCheck] = useState(false);
  const [isFormalMinute, setIsFormalMinute] = useState(false);
  const [isFollowUpLetter, setIsFollowUpLetter] = useState(false);
  const [isEmailResponse, setIsEmailResponse] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [fineTunePrompt, setFineTunePrompt] = useState('');

  // File handling states
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileReading, setIsFileReading] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Translations
  const translations = {
    "en-US": {
      "appTitle": "Meeting Intelligence Summarizer",
      "inputPlaceholder": "Paste your meeting transcript or email thread here, or upload a supported file.",
      "summarizeButton": "Generate Summary",
      "clearButton": "Clear",
      "exportButton": "Export",
      "dragDropText": "Drop files here (.txt, .pdf, .docx, .md, .json, etc.) or browse",
      "summarizing": "Analyzing and generating summary...",
      "regenerating": "Regenerating summary...",
      "errorMessage": "An error occurred. Please try again.",
      "noContent": "Please provide content to process.",
      "attribution": "Powered by Google Gemini",
      "inputSection": "Input Transcript",
      "outputSection": "Generated Summary",
      "elaborateOption": "Elaborate Analysis (Richer, in-depth version)",
      "qualityOption": "Quality Check (3 independent checks for consistency)",
      "formalMinuteOption": "Formal Meeting Minute",
      "followUpLetterOption": "Post-Meeting Follow-Up Letter",
      "emailResponseOption": "Summarize email and draft a response",
      "statusPass1": "Agentic Analysis: Initial summarization pass...",
      "statusPass2": "Agentic Analysis: Elaborating with deep dive agents...",
      "statusIntegrating": "Agentic Analysis: Verifying consistency and integrating results...",
      "summaryLabel": "Summary",
      "presenterLabel": "Presenter",
      "actionOwnerLabel": "Action Owner",
      "actionItemHeader": "Action Item",
      "ownerHeader": "Action Owner",
      "dueDateHeader": "Due Date",
      "priorityHeader": "Priority",
      "executiveSummaryHeader": "Executive Summary",
      "keyTopicsHeader": "Key Topics Breakdown",
      "actionItemsHeader": "Action Items & Follow-ups",
      "topicHeader": "Topic",
      "readingFile": "Reading file content...",
      "unsupportedFileReadError": "Content extraction for this file type is not supported in the browser. Please convert to a supported format.",
      "unsupportedPptError": "'.ppt' format is not supported. Please save the file as '.pptx' and try again.",
      "unsupportedMp3Error": "Audio file detected. Please transcribe the audio to text and paste it here for summarization.",
      "invalidFileType": "Invalid file type. Please use one of the supported formats.",
      "fineTuneHeader": "Fine-Tune Summary",
      "fineTunePlaceholder": "Enter corrections or formatting instructions. E.g., 'Change all instances of Project X to Project Alpha.' or 'Combine the first two topics.'",
      "regenerateButton": "Regenerate",
      "formal_meetingDetails": "Meeting Details",
      "formal_meetingTitle": "Meeting Title",
      "formal_dateTime": "Date and Time",
      "formal_location": "Location",
      "formal_attendees": "Attendees",
      "formal_objectivePurpose": "Meeting Objective/Purpose",
      "formal_purpose": "Purpose of Meeting",
      "formal_agendaDiscussion": "Agenda Items and Discussion",
      "formal_agendaItems": "Agenda Items",
      "formal_discussionSummary": "Discussion Summary",
      "formal_decisionsActions": "Decisions and Action Items",
      "formal_decisionsMade": "Decisions Made",
      "formal_actionItems": "Action Items",
      "formal_actionItem": "Action Item",
      "formal_responsible": "Responsible",
      "formal_deadline": "Deadline",
      "formal_nextStepsClosing": "Next Steps and Closing",
      "formal_nextMeeting": "Next Meeting",
      "formal_adjournment": "Adjournment",
      "formal_preparedBy": "Minutes Prepared By",
    },
    "zh-TW": {
      "appTitle": "會議智慧摘要工具",
      "inputPlaceholder": "請在此貼上您的會議記錄或郵件串，或上傳支援的檔案。",
      "summarizeButton": "生成摘要",
      "clearButton": "清除",
      "exportButton": "匯出",
      "dragDropText": "拖放檔案於此 (.txt, .pdf, .docx, .md, .json 等) 或瀏覽",
      "summarizing": "正在分析並生成摘要...",
      "regenerating": "正在重新生成摘要...",
      "errorMessage": "發生錯誤，請重試。",
      "noContent": "請提供內容以進行處理。",
      "attribution": "由 Google Gemini 提供支援",
      "inputSection": "輸入會議記錄",
      "outputSection": "生成摘要",
      "elaborateOption": "詳細分析 (更豐富、深入的版本)",
      "qualityOption": "品質檢查 (3次獨立檢查以確保一致性)",
      "formalMinuteOption": "正式會議記錄",
      "followUpLetterOption": "會後追蹤信",
      "emailResponseOption": "總結郵件並草擬回覆",
      "statusPass1": "代理分析：初步摘要中...",
      "statusPass2": "代理分析：深度分析代理介入...",
      "statusIntegrating": "代理分析：驗證一致性並整合結果...",
      "summaryLabel": "摘要",
      "presenterLabel": "報告人",
      "actionOwnerLabel": "負責人",
      "actionItemHeader": "行動項目",
      "ownerHeader": "負責人",
      "dueDateHeader": "截止日期",
      "priorityHeader": "優先級",
      "executiveSummaryHeader": "執行摘要",
      "keyTopicsHeader": "關鍵議題分解",
      "actionItemsHeader": "行動項目與後續",
      "topicHeader": "議題",
      "readingFile": "正在讀取檔案內容...",
      "unsupportedFileReadError": "瀏覽器不支援讀取此文件類型的內容。請轉換為支援的格式。",
      "unsupportedPptError": "不支援 '.ppt' 格式。請將檔案另存為 '.pptx' 後再試一次。",
      "unsupportedMp3Error": "偵測到音訊檔案。請先將音訊轉為文字後再貼上以進行摘要。",
      "invalidFileType": "文件類型無效。請使用支援的格式。",
      "fineTuneHeader": "微調摘要",
      "fineTunePlaceholder": "請輸入修正或格式重組指令。例如：「將所有'專案X'改為'Alpha專案'」或「合併前兩個議題」。",
      "regenerateButton": "重新生成",
      "formal_meetingDetails": "會議詳情",
      "formal_meetingTitle": "會議標題",
      "formal_dateTime": "日期與時間",
      "formal_location": "地點",
      "formal_attendees": "出席者",
      "formal_objectivePurpose": "會議目標／目的",
      "formal_purpose": "會議目的",
      "formal_agendaDiscussion": "議程項目與討論",
      "formal_agendaItems": "議程項目",
      "formal_discussionSummary": "討論摘要",
      "formal_decisionsActions": "決議與行動項目",
      "formal_decisionsMade": "達成決議",
      "formal_actionItems": "行動項目",
      "formal_actionItem": "行動項目",
      "formal_responsible": "負責人",
      "formal_deadline": "完成期限",
      "formal_nextStepsClosing": "後續步驟與結束",
      "formal_nextMeeting": "下次會議",
      "formal_adjournment": "散會時間",
      "formal_preparedBy": "會議記錄者",
    }
  };
  const t = (key) => translations[currentLocale][key] || key;

  useEffect(() => {
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('zh')) setCurrentLocale('zh-TW');

    const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });

    Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"),
        loadScript("https://unpkg.com/html-docx-js/dist/html-docx.js"),
    ]).then(() => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        console.log("External parsing and saving libraries loaded.");
    }).catch(err => {
        console.error(err);
        setError("Failed to load necessary libraries for file parsing. Please try refreshing the page.");
    });
  }, []);

  const MarkdownRenderer = ({ content }) => {
    const renderMarkdown = (text) => {
        if (!text) return null;

        const parts = text.split(/(\n(?:\|.*\|(?:\n|$))+)/);
        const elements = [];

        parts.forEach((part, index) => {
            if (part.trim().startsWith('|')) {
                const lines = part.trim().split('\n');
                if (lines.length < 2) return;
                const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
                const dataRows = lines.slice(2).map(line => line.split('|').map(c => c.trim()).filter(Boolean));
                elements.push(
                    <table key={`table-${index}`} style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0' }}>
                        <thead>
                            <tr>{headers.map((header, i) => <th key={i} style={{ padding: '10px', border: '1px solid #e0e8e0', textAlign: 'left', background: '#f5f8f5', color: '#374528' }}>{header}</th>)}</tr>
                        </thead>
                        <tbody>
                            {dataRows.map((row, rIndex) => (<tr key={rIndex}>{row.map((cell, cIndex) => <td key={cIndex} style={{ padding: '10px', border: '1px solid #e0e8e0', color: '#374528' }}>{cell}</td>)}</tr>))}
                        </tbody>
                    </table>
                );
            } else {
                part.split('\n').forEach((line, lineIndex) => {
                    const key = `line-${index}-${lineIndex}`;
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                        elements.push(<h2 key={key} style={{ fontSize: '20px', fontWeight: '700', color: '#374528', marginTop: '24px', marginBottom: '16px' }}>{trimmedLine.replace(/\*\*/g, '')}</h2>);
                    } else if (trimmedLine.startsWith('- **')) {
                        const content = trimmedLine.replace(/^- \*\*(.*?)\*\*:/, '').trim();
                        const label = trimmedLine.match(/\*\*(.*?)\*\*/)[1];
                        elements.push(<p key={key} style={{ margin: '12px 0', paddingLeft: '20px', textIndent: '-20px', color: '#374528', lineHeight: '1.6' }}><strong>{label}:</strong> {content}</p>);
                    } else if (trimmedLine.startsWith('●')) {
                        elements.push(<p key={key} style={{ margin: '10px 0', paddingLeft: '20px', color: '#374528', lineHeight: '1.6' }}>{trimmedLine}</p>);
                    } else if (trimmedLine.startsWith('○')) {
                        elements.push(<p key={key} style={{ margin: '5px 0', paddingLeft: '40px', color: '#374528', lineHeight: '1.6' }}>{trimmedLine}</p>);
                    } else if (trimmedLine.startsWith('■')) {
                        elements.push(<p key={key} style={{ margin: '5px 0', paddingLeft: '60px', color: '#374528', lineHeight: '1.6' }}>{trimmedLine}</p>);
                    } else if (trimmedLine.startsWith('-')) {
                        elements.push(<p key={key} style={{ margin: '5px 0', paddingLeft: '80px', color: '#374528', lineHeight: '1.6' }}>{trimmedLine}</p>);
                    } else if (trimmedLine) {
                        elements.push(<p key={key} style={{ margin: '12px 0', color: '#374528', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}/>);
                    }
                });
            }
        });
        return elements;
    };
    return <div>{renderMarkdown(content)}</div>;
  };

  const allowedFileTypes = [".txt", ".pdf", ".docx", ".xls", ".xlsx", ".csv", ".srt", ".ppt", ".pptx", ".html", ".mp3", ".md", ".json"];

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadedFile(file);
    setError('');
    setRawNotes('');
    setIsFileReading(true);
    try {
      const content = await readFileContent(file);
      setRawNotes(content);
    } catch (err) {
      setError(err.message);
      setRawNotes(`Error: ${err.message}`);
    } finally {
      setIsFileReading(false);
    }
  };

  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const reader = new FileReader();
        const textBasedExtensions = ['.txt', '.csv', '.srt', '.md'];

        if (textBasedExtensions.includes(fileExtension)) {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Error reading text file.'));
            reader.readAsText(file);
        } else if (fileExtension === '.json') {
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    resolve(JSON.stringify(parsed, null, 2));
                } catch(err) {
                    reject(new Error("Failed to parse JSON file."))
                }
            };
            reader.onerror = () => reject(new Error('Error reading JSON file.'));
            reader.readAsText(file);
        } else if (fileExtension === '.html') {
            reader.onload = (e) => resolve(stripHtml(e.target.result));
            reader.onerror = () => reject(new Error('Error reading HTML file.'));
            reader.readAsText(file);
        } else if (fileExtension === '.pdf') {
            if (!window.pdfjsLib) return reject(new Error("PDF parsing library not loaded."));
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target.result);
                    const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
                    let textContent = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const text = await page.getTextContent();
                        textContent += text.items.map(s => s.str).join(' ') + '\n';
                    }
                    resolve(textContent);
                } catch (err) { reject(new Error(`Failed to parse PDF: ${err.message}`)); }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === '.docx') {
            if (!window.mammoth) return reject(new Error("DOCX parsing library not loaded."));
            reader.onload = async (e) => {
                try {
                    const result = await window.mammoth.extractRawText({ arrayBuffer: e.target.result });
                    resolve(result.value);
                } catch (err) { reject(new Error(`Failed to parse DOCX: ${err.message}`)); }
            };
            reader.readAsArrayBuffer(file);
        } else if (['.xls', '.xlsx'].includes(fileExtension)) {
            if (!window.XLSX) return reject(new Error("Excel parsing library not loaded."));
             reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, {type: 'array'});
                    let fullText = '';
                    workbook.SheetNames.forEach(sheetName => {
                        fullText += `Sheet: ${sheetName}\n\n`;
                        fullText += window.XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + '\n\n';
                    });
                    resolve(fullText);
                } catch (err) { reject(new Error(`Failed to parse Excel file: ${err.message}`)); }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === '.pptx') {
            if (!window.JSZip) return reject(new Error("PPTX parsing library not loaded."));
            reader.onload = async (e) => {
                try {
                    const zip = await window.JSZip.loadAsync(e.target.result);
                    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
                    let fullText = '';
                    for (const slideFile of slideFiles) {
                        const slideContent = await zip.file(slideFile).async('string');
                        const textNodes = slideContent.match(/<a:t>.*?<\/a:t>/g) || [];
                        const slideText = textNodes.map(node => node.replace(/<.*?>/g, '')).join(' ');
                        fullText += slideText + '\n\n';
                    }
                    resolve(fullText.trim());
                } catch (err) { reject(new Error(`Failed to parse PPTX: ${err.message}`)); }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === '.ppt') {
            reject(new Error(t('unsupportedPptError')));
        } else if (fileExtension === '.mp3') {
            reject(new Error(t('unsupportedMp3Error')));
        } else {
            reject(new Error(t('unsupportedFileReadError')));
        }
    });
  };

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false); dragCounter.current = 0;
    const files = [...e.dataTransfer.files];
    const validFile = files.find(file => allowedFileTypes.some(ext => file.name.toLowerCase().endsWith(ext)));
    if (validFile) handleFileUpload(validFile);
    else setError(t('invalidFileType'));
  };

  const getStandardOutputFormatInstruction = () => `Your output must be a valid Markdown document that strictly follows this format:
# ${t('executiveSummaryHeader')}
...
| ${t('actionItemHeader')} | ${t('ownerHeader')} | ${t('dueDateHeader')} | ${t('priorityHeader')} |
|---|---|---|---|
`;

  const getFormalMinuteFormatInstruction = () => `Your output must be a valid Markdown document that strictly follows this formal meeting minute format. Infer all details from the transcript. If a detail is not available, state "*N/A*". Do not use markdown hashes (#) for headings, use **bold** instead.

**${t('formal_meetingDetails')}**
- **${t('formal_meetingTitle')}**: [Inferred title]
- **${t('formal_dateTime')}**: [Inferred date and time]
- **${t('formal_location')}**: [Inferred location]
- **${t('formal_attendees')}**: [List of attendees present. Note any absentees if mentioned.]

**${t('formal_objectivePurpose')}**
- **${t('formal_purpose')}**: [Brief statement explaining why the meeting was held.]

**${t('formal_agendaDiscussion')}**
- **${t('formal_agendaItems')}**:
    ● [Agenda Item 1]
    ● [Agenda Item 2]
- **${t('formal_discussionSummary')}**:
    ● **[Agenda Item 1]**:
        ○ [Key point or discussion summary]
            ■ [Further detail or sub-point]
                - [Innermost detail]
    ● **[Agenda Item 2]**:
        ○ [Key point or discussion summary]

**${t('formal_decisionsActions')}**
- **${t('formal_decisionsMade')}**: [Clear record of any decisions made.]
- **${t('formal_actionItems')}**:
| ${t('formal_actionItem')} | ${t('formal_responsible')} | ${t('formal_deadline')} |
|---|---|---|
| [Task description] | [Person's Name] | [Date] |

**${t('formal_nextStepsClosing')}**
- **${t('formal_nextMeeting')}**: [Date, time, and location of the next meeting, if applicable.]
- **${t('formal_adjournment')}**: [The time the meeting ended.]
- **${t('formal_preparedBy')}**: Gemini Assistant
`;

const getFollowUpLetterFormatInstruction = () => `Your output must be a professional follow-up letter. Do not use Markdown features like **bold** or # for headings. Use plain text for headings. For list items, start the line with '●'. For action items, you must use a markdown table.

Subject: Follow-Up: [Meeting Title]

Hi [Recipient Name(s)],

Thank you for your time and valuable contributions during our meeting.

Here is a brief recap of our discussion and the key decisions made:
● [Summary of main points and decisions]
● [Another key point or decision]

The action items we agreed upon are as follows:
| Action Item | Responsible | Deadline |
|---|---|---|
| [Task description] | [Person's Name] | [Date] |

All relevant documents discussed are attached for your reference.

Please feel free to reach out if you have any questions or need further clarification.

Best Regards,
Arthur
`;

const getEmailResponsePrompt = (content) => `YOU ARE A HIGHLY SKILLED EMAIL THREAD ANALYST AND RESPONSE ASSISTANT...`; // Omitted for brevity

const getEmailResponseFormatInstruction = () => `Your output must be a valid Markdown document that strictly follows this format:
1. **THREAD SUMMARY**: A BRIEF PARAGRAPH SUMMARIZING THE EMAIL CHAIN
...
**[Is the reply align with the direction and tone you are going, let me know if you would like to respond differently!]**
`;

  const constructAgenticPrompt = (options) => {
    const { content, isElaborate, isQualityCheck, isFormalMinute, isFollowUpLetter, isEmailResponse, locale } = options;

    if(isEmailResponse) {
        return getEmailResponsePrompt(content);
    }

    const languageInstruction = locale === 'zh-TW'
        ? "Your response must be in Traditional Chinese (Taiwan)."
        : "Your response must be in English.";

      let formatInstruction;
      if(isFollowUpLetter) {
        formatInstruction = getFollowUpLetterFormatInstruction();
      } else if (isFormalMinute) {
        formatInstruction = getFormalMinuteFormatInstruction();
      } else {
        formatInstruction = getStandardOutputFormatInstruction();
      }

    const additionalInstructions = [];
    if (isElaborate) {
        additionalInstructions.push("- For each section and point, provide a more detailed, richer, in-depth version based on the transcript.");
    }
    if (isQualityCheck) {
        additionalInstructions.push("- After generating the content, perform a final quality check to identify and correct any inconsistencies or errors based on the original transcript.");
    }

    let prompt = `Your primary task is to create a structured document from the following transcript.
${languageInstruction}

**Core Task:**
Analyze the provided transcript and generate a response that strictly follows the format specified under "REQUIRED OUTPUT FORMAT".

**Additional Instructions (Apply all that are listed):**
${additionalInstructions.length > 0 ? additionalInstructions.join('\n') : "- None."}

**TRANSCRIPT:**
\`\`\`
${content}
\`\`\`

**REQUIRED OUTPUT FORMAT:**
${formatInstruction}
`;

    return prompt;
  };

  const callGeminiAPI = async (prompt) => {
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("API Error Response:", errorBody);
        throw new Error(`API call failed with status: ${response.status}`);
    }
    const result = await response.json();
    const summaryText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!summaryText) {
        console.error("Invalid API response structure:", result);
        throw new Error("Received an invalid or empty response from the API.");
    }
    return summaryText;
  };

  const summarizeNotes = async () => {
    const content = rawNotes.trim();
    if (!content || content.startsWith('Error:')) { setError(t('noContent')); return; }

    setIsLoading(true); setError(''); setSummary('');

    try {
      setProcessingStatus(t('summarizing'));

      const agenticPrompt = constructAgenticPrompt({ content, isElaborate: elaborateVersion, isQualityCheck: qualityCheck, isFormalMinute: isFormalMinute, isFollowUpLetter: isFollowUpLetter, isEmailResponse: isEmailResponse, locale: currentLocale });
      const summaryText = await callGeminiAPI(agenticPrompt);
      setSummary(summaryText);
    } catch (err) {
      setError(`${t('errorMessage')} - ${err.message}`);
      console.error('Processing error:', err);
    } finally {
      setIsLoading(false);
      setProcessingStatus('');
    }
  };

  const handleFineTune = async () => {
    if (!fineTunePrompt.trim() || !rawNotes.trim()) {
        setError("Please enter a fine-tune instruction.");
        return;
    }
    setIsRegenerating(true);
    setError('');

    try {
        const languageInstruction = currentLocale === 'zh-TW'
            ? "Your response must be in Traditional Chinese (Taiwan)."
            : "Your response must be in English.";

        let formatInstruction;
        if(isEmailResponse) {
            formatInstruction = getEmailResponseFormatInstruction();
        } else if(isFollowUpLetter) {
            formatInstruction = getFollowUpLetterFormatInstruction();
        } else if (isFormalMinute) {
            formatInstruction = getFormalMinuteFormatInstruction();
        } else {
            formatInstruction = getStandardOutputFormatInstruction();
        }

        const fineTuneUserPrompt = `Your task is to revise the "Previous Summary" based on the "User's Instructions". Use the "Original Transcript" for context to ensure accuracy.

**Original Transcript:**
\`\`\`
${rawNotes}
\`\`\`

**Previous Summary (to be corrected):**
\`\`\`
${summary}
\`\`\`

**User's Instructions for Correction/Reorganization:**
"${fineTunePrompt}"

**Task:**
Regenerate the entire summary, incorporating the user's instructions.
${languageInstruction}
Ensure the corrected summary still accurately reflects the original transcript and strictly follows the required Markdown format.

**REQUIRED OUTPUT FORMAT:**
${formatInstruction}
`;
        const newSummary = await callGeminiAPI(fineTuneUserPrompt);
        setSummary(newSummary);
        setFineTunePrompt('');
    } catch (err) {
        setError(`${t('errorMessage')} - ${err.message}`);
        console.error('Fine-tuning error:', err);
    } finally {
        setIsRegenerating(false);
    }
  };

  const parseMarkdownSummary = (markdown) => {
      // This parser is for the standard format and will not work perfectly for the formal one.
      // It's kept for JSON/XLS export of the standard summary.
      const execSummaryMatch = markdown.match(new RegExp(`# ${t('executiveSummaryHeader')}([\\s\\S]*?)# ${t('keyTopicsHeader')}`));
      const keyTopicsMatch = markdown.match(new RegExp(`# ${t('keyTopicsHeader')}([\\s\\S]*?)# ${t('actionItemsHeader')}`));
      const actionItemsMatch = markdown.match(new RegExp(`# ${t('actionItemsHeader')}([\\s\\S]*)`));

      const executiveSummary = execSummaryMatch ? execSummaryMatch[1].trim() : '';

      const keyTopics = [];
      if (keyTopicsMatch) {
          const topicBlocks = keyTopicsMatch[1].trim().split(`## ${t('topicHeader')}:`);
          topicBlocks.forEach(block => {
              if (block.trim()) {
                  const lines = block.trim().split('\n');
                  const topic = lines[0].trim();
                  const summaryLine = lines.find(l => l.includes(`- ${t('summaryLabel')}:`));
                  const presenterLine = lines.find(l => l.includes(`- ${t('presenterLabel')}:`));
                  const ownerLine = lines.find(l => l.includes(`- ${t('actionOwnerLabel')}:`));
                  keyTopics.push({ topic, summary: summaryLine?.split(': ')[1] || '', presenter: presenterLine?.split(': ')[1] || '', actionOwner: ownerLine?.split(': ')[1] || '' });
              }
          });
      }

      const actionItems = [];
      if (actionItemsMatch) {
          const tableRows = actionItemsMatch[1].trim().split('\n').slice(2);
          tableRows.forEach(row => {
              const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
              if (cells.length === 4) {
                  actionItems.push({ [t('actionItemHeader')]: cells[0], [t('ownerHeader')]: cells[1], [t('dueDateHeader')]: cells[2], [t('priorityHeader')]: cells[3] });
              }
          });
      }

      return { executiveSummary, keyTopics, actionItems };
  };

  const exportToJson = (summary, filename) => {
      const data = parseMarkdownSummary(summary);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      window.saveAs(blob, `${filename}.json`);
  };

  const exportToXls = (summary, filename) => {
      if (!window.XLSX) { setError("Excel export library not loaded."); return; }
      const data = parseMarkdownSummary(summary);
      if(data.actionItems.length === 0){
        setError("No action items found in the standard format to export.");
        return;
      }
      const ws = window.XLSX.utils.json_to_sheet(data.actionItems);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Action Items");
      window.XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToDocx = (summary, filename) => {
      if (!window.htmlDocx || !window.saveAs) { setError("DOCX export library not loaded."); return; }
      const htmlContent = convertMarkdownToHTML(summary, filename);
      const blob = window.htmlDocx.asBlob(htmlContent);
      window.saveAs(blob, `${filename}.docx`);
  };

  const exportSummary = () => {
    const filename = `meeting-summary-${new Date().toISOString().split('T')[0]}`;

    switch (exportFormat) {
      case 'pdf': generatePDF(summary, filename); return;
      case 'md':
        const mdBlob = new Blob([summary], { type: 'text/markdown' });
        window.saveAs(mdBlob, `${filename}.md`);
        return;
      case 'docx': exportToDocx(summary, filename); return;
      case 'json': exportToJson(summary, filename); return;
      case 'xls': exportToXls(summary, filename); return;
      case 'html':
        const htmlContent = convertMarkdownToHTML(summary, filename);
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        window.saveAs(htmlBlob, `${filename}.html`);
        return;
      default: break;
    }
  };
  const convertMarkdownToHTML = (markdown, title) => {
    let html = markdown;
    const tableRegex = /(\|.*\|(?:\n|$))+/g;
    html = html.replace(tableRegex, (match) => {
        let tableHTML = '<table>';
        const rows = match.trim().split('\n');
        const headers = rows[0].split('|').map(h => h.trim()).filter(Boolean);
        tableHTML += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
        const dataRows = rows.slice(2).map(row => row.split('|').map(c => c.trim()).filter(Boolean));
        tableHTML += '<tbody>' + dataRows.map(row => '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>').join('') + '</tbody>';
        return tableHTML + '</table>';
    });

    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>');
    html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\n<ul>/gim, '');
    html = html.replace(/\n/g, '<br>');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:sans-serif;line-height:1.6;color:#333;padding:40px;max-width:800px;margin:auto;}h1,h2{color:#2c3e50;}h1{border-bottom:2px solid #ccc;padding-bottom:10px;}h2{margin-top:2em; border-bottom:1px solid #eee;padding-bottom:5px;}table{width:100%;border-collapse:collapse;margin:15px 0;}th{background:#f8f9fa;padding:10px;text-align:left;border:1px solid #dee2e6;}td{padding:8px;border:1px solid #dee2e6;}</style></head><body>${html}</body></html>`;
  };
  const generatePDF = (content, filename) => {
      const htmlContent = convertMarkdownToHTML(content, filename);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
          printWindow.onload = () => {
              setTimeout(() => {
                  printWindow.print();
                  URL.revokeObjectURL(url);
              }, 500);
          };
      }
  };
  const clearAll = () => {
    setRawNotes(''); setSummary(''); setUploadedFile(null);
    setError(''); setProcessingStatus('');
  };
  const formatFileSize = (bytes) => bytes < 1024 ? `${bytes} B` : `${(bytes/1024).toFixed(1)} KB`;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #C4DDAB 0%, #a8c590 100%)', padding: '20px', fontFamily: '-apple-system, BlinkMacFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <h1 style={{ color: '#374528', fontSize: '28px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={28} /> {t('appTitle')}
        </h1>
        <button onClick={() => setCurrentLocale(currentLocale === 'en-US' ? 'zh-TW' : 'en-US')} style={{ background: '#ffffff', border: '2px solid #7a947a', borderRadius: '8px', padding: '8px 16px', color: '#374528', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} /> {currentLocale === 'en-US' ? '中文' : 'English'}
        </button>
      </div>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Left Panel */}
        <div>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)' }}>
            <h2 style={{ color: '#374528', fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Hash size={18} /> {t('inputSection')}
            </h2>
             <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} style={{ background: isDragging ? '#e8f4e8' : '#f9fdf9', border: `2px dashed ${isDragging ? '#374528' : '#a8c590'}`, borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', marginBottom: '12px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                 <Upload size={20} color="#5a6b4a" />
                 <p style={{ color: '#374528', fontSize: '14px', fontWeight: '600', margin: 0 }}>{t('dragDropText')}</p>
               </div>
               <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept={allowedFileTypes.join(',')} onChange={(e) => handleFileUpload(e.target.files[0])} />
             </div>
            {uploadedFile && <div style={{ marginBottom: '12px', padding: '8px', background: '#e8f4e8', borderRadius: '6px', fontSize: '12px' }}><FileText size={14} color="#374528" /> <span style={{ color: '#374528' }}>{uploadedFile.name} ({formatFileSize(uploadedFile.size)})</span></div>}
            <div style={{ position: 'relative' }}>
                {isFileReading && <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '8px'}}><Loader2 size={24} className="animate-spin" /> <span style={{marginTop: '10px', color: '#374528'}}>{t('readingFile')}</span></div>}
                <textarea value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} placeholder={t('inputPlaceholder')} style={{ width: '100%', height: '350px', padding: '10px', border: '2px solid #a8c590', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: '12px', opacity: isFileReading ? 0.5 : 1 }} disabled={isFileReading} />
            </div>
             <div style={{ padding: '12px', background: '#f9fdf9', borderRadius: '6px', border: '1px solid #e0e8e0', marginBottom: '16px' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', cursor: 'pointer', fontSize: '13px' }}>
                 <input type="checkbox" checked={elaborateVersion} onChange={(e) => setElaborateVersion(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                 <span style={{ color: '#374528' }}>{t('elaborateOption')}</span>
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '6px',  marginBottom: '8px', cursor: 'pointer', fontSize: '13px' }}>
                 <input type="checkbox" checked={qualityCheck} onChange={(e) => setQualityCheck(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                 <span style={{ color: '#374528' }}>{t('qualityOption')}</span>
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '6px',  marginBottom: '8px', cursor: 'pointer', fontSize: '13px' }}>
                 <input type="checkbox" checked={isFormalMinute} onChange={(e) => setIsFormalMinute(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                 <span style={{ color: '#374528' }}>{t('formalMinuteOption')}</span>
               </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px',  marginBottom: '8px', cursor: 'pointer', fontSize: '13px' }}>
                 <input type="checkbox" checked={isFollowUpLetter} onChange={(e) => setIsFollowUpLetter(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                 <span style={{ color: '#374528' }}>{t('followUpLetterOption')}</span>
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                 <input type="checkbox" checked={isEmailResponse} onChange={(e) => setIsEmailResponse(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                 <span style={{ color: '#374528' }}>{t('emailResponseOption')}</span>
               </label>
             </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={summarizeNotes} disabled={isLoading || isRegenerating || isFileReading || !rawNotes.trim()} style={{ flex: 1, padding: '12px', background: (isLoading || isRegenerating || isFileReading || !rawNotes.trim()) ? '#ccc' : '#374528', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: (isLoading || isRegenerating || isFileReading || !rawNotes.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isLoading ? (<><Loader2 size={18} className="animate-spin" /> {processingStatus || t('summarizing')}</>) : (<>{t('summarizeButton')}</>)}
              </button>
              <button onClick={clearAll} style={{ padding: '12px 20px', background: '#ffffff', color: '#374528', border: '2px solid #7a947a', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                <RefreshCw size={16} />{t('clearButton')}
              </button>
            </div>
          </div>
          {summary && !isLoading && !isRegenerating && (
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)', marginTop: '20px' }}>
                <h3 style={{ color: '#374528', fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0' }}>{t('fineTuneHeader')}</h3>
                <textarea
                    value={fineTunePrompt}
                    onChange={(e) => setFineTunePrompt(e.target.value)}
                    placeholder={t('fineTunePlaceholder')}
                    style={{ width: '100%', minHeight: '80px', padding: '10px', border: '2px solid #a8c590', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: '12px' }}
                />
                <button
                    onClick={handleFineTune}
                    disabled={isRegenerating || isLoading || !fineTunePrompt.trim()}
                    style={{ width: '100%', padding: '12px', background: (isRegenerating || isLoading || !fineTunePrompt.trim()) ? '#ccc' : '#5a6b4a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: (isRegenerating || isLoading || !fineTunePrompt.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {isRegenerating ? (<><Loader2 size={18} className="animate-spin" /> {t('regenerating')}</>) : <>{t('regenerateButton')}</>}
                </button>
            </div>
          )}
        </div>
        {/* Right Panel */}
        <div>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)', minHeight: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #e0e8e0' }}>
              <h2 style={{ color: '#374528', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                <FileText size={18} style={{marginRight: '8px'}} /> {t('outputSection')}
              </h2>
              {summary && !isLoading && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #7a947a', background: 'white', color: '#374528' }}>
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                    <option value="md">Markdown</option>
                    <option value="json">JSON</option>
                    <option value="xls">XLS</option>
                    <option value="html">HTML</option>
                  </select>
                  <button onClick={exportSummary} style={{ padding: '6px 12px', background: '#374528', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={14} />{t('exportButton')}
                  </button>
                </div>
              )}
            </div>
            {error && <div style={{ marginBottom: '12px', padding: '10px', background: '#ffe8e8', borderRadius: '6px', color: '#d73a49', fontSize: '13px', display: 'flex', alignItems: 'center' }}><AlertCircle size={16} style={{marginRight: '6px'}} /> {error}</div>}

            {summary ? (
                <div style={{ padding: '10px', background: '#fafffe', borderRadius: '8px', border: '1px solid #e0e8e0', minHeight: '450px', overflowY: 'auto' }}><MarkdownRenderer content={summary} /></div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '450px', color: '#7a947a', textAlign: 'center' }}>
                <div>
                  <FileText size={48} color="#d4e8d4" style={{ marginBottom: '16px' }} />
                  <p>{isLoading || isRegenerating ? (processingStatus || t('summarizing')) : (currentLocale === 'zh-TW' ? '您的會議摘要將顯示在這裡' : 'Your meeting summary will appear here')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '1400px', margin: '30px auto 0', textAlign: 'center', color: '#374528', fontSize: '12px' }}>{t('attribution')}</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
};

export default MeetingNotesSummaryApp;
