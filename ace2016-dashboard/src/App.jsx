import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Treemap } from 'recharts';
import { Upload, Filter, Calendar, Users, TrendingUp, AlertTriangle, FileText, Activity, Target, CheckCircle, Eye, ChevronRight, X, RefreshCw, Home, ArrowLeft, Clock, MapPin, Building2, User, FileSpreadsheet, ChevronDown, Zap } from 'lucide-react';

/**
 * ACE2016-001 Clinical Trial Dashboard
 * Interactive multi-level drill-down with efficient KPI display
 */
const ACE2016Dashboard = () => {
  // ============ STATE MANAGEMENT ============
  const [appState, setAppState] = useState('upload');
  const [processedData, setProcessedData] = useState(null);
  const [processingLog, setProcessingLog] = useState([]);
  const [isPapaReady, setIsPapaReady] = useState(false); // To track if PapaParse is loaded

  // Navigation State
  const [navigationState, setNavigationState] = useState({
    level: 'project', // project, country, site, patient, visit
    selectedProject: null,
    selectedCountry: null,
    selectedSite: null,
    selectedPatient: null,
    selectedVisit: null,
    breadcrumb: ['Project Overview']
  });

  // UI State
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [activeKPIFilter, setActiveKPIFilter] = useState(null);
  const [showVisitDetails, setShowVisitDetails] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    siteGroup: 'all',
    instanceName: 'all',
    visitStatus: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

  // Effect to load PapaParse script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
    script.async = true;
    script.onload = () => setIsPapaReady(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const addLog = useCallback((type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog(prev => [...prev, { type, message, timestamp }]);
  }, []);

  // ============ DATA PROCESSING (MODIFIED FOR GOOGLE DRIVE) ============
  // This is the stable "Publish to web" URL from Google Sheets.
  const GOOGLE_SHEETS_PUBLISHED_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgLiXYDVy0-pL8TTDvehVIvlxyVRcovQjvDmNfbXo7oBff-YyMN1FGR6B88Vl_TZY7zbZyZj6a5zPX/pub?output=csv';

  const loadDataFromDrive = async () => {
    setAppState('processing');
    addLog('info', 'Fetching data from Google Sheets...');

    try {
      const response = await fetch(GOOGLE_SHEETS_PUBLISHED_CSV_URL);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const csvText = await response.text();
      addLog('info', 'Data fetched, parsing content...');

      window.Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          addLog('info', `Parsed ${results.data.length} records`);
          const data = processDataStructure(results.data);
          setProcessedData(data);
          addLog('success', `Dashboard ready: ${data.summary.totalSubjects} subjects across ${data.summary.totalSites} sites`);

          setNavigationState(prev => ({
            ...prev,
            selectedProject: data.project.name
          }));

          setTimeout(() => setAppState('dashboard'), 1000);
        },
        error: (error) => {
          addLog('error', `Parsing failed: ${error.message}`);
          setAppState('upload');
        }
      });
    } catch (error) {
      addLog('error', `Failed to fetch or process data: ${error.message}`);
      setAppState('upload');
    }
  };

  const processDataStructure = (rawData) => {
    const countriesMap = new Map();
    const sitesMap = new Map();
    const subjectsMap = new Map();
    const visitsArray = [];

    const project = {
      name: rawData[0]?.project || 'ACE2016-001',
      studyId: rawData[0]?.studyid || 6
    };

    rawData.forEach(row => {
      let country = 'Unknown';
      const siteName = row.Site || '';

      if (siteName.includes('Taiwan') || siteName.includes('Taipei') ||
          siteName.includes('Taichung') || siteName.includes('Chang Gung') ||
          siteName.includes('Mackay')) {
        country = 'Taiwan';
      } else if (siteName.includes('California') || siteName.includes('Colorado') ||
                 siteName.includes('Texas') || siteName.includes('SCRI') ||
                 siteName.includes('Oncology')) {
        country = 'United States';
      }

      if (!countriesMap.has(country)) {
        countriesMap.set(country, {
          name: country,
          sites: new Set(),
          subjects: new Set(),
          totalVisits: 0,
          region: row.SiteGroup || 'World'
        });
      }

      const siteKey = row.SiteNumber;
      if (!sitesMap.has(siteKey)) {
        sitesMap.set(siteKey, {
          siteNumber: row.SiteNumber,
          siteName: row.Site,
          country: country,
          siteGroup: row.SiteGroup || 'Unknown',
          subjects: new Set(),
          visits: 0
        });
      }

      const subjectKey = row.Subject;
      if (!subjectsMap.has(subjectKey)) {
        subjectsMap.set(subjectKey, {
          subjectId: row.Subject,
          siteNumber: row.SiteNumber,
          siteName: row.Site,
          country: country,
          visits: [],
          screeningDate: null,
          lastVisitDate: null,
          currentPhase: null,
          maxCycle: 0,
          hasLymphodepletion: false,
          visitCount: 0,
          missingVisits: 0,
          completedVisits: 0
        });
      }

      countriesMap.get(country).sites.add(siteKey);
      countriesMap.get(country).subjects.add(subjectKey);
      countriesMap.get(country).totalVisits++;

      sitesMap.get(siteKey).subjects.add(subjectKey);
      sitesMap.get(siteKey).visits++;
      sitesMap.get(siteKey).country = country;

      const visit = {
        visitId: `${row.Subject}-${row.InstanceRepeatNumber || 0}-${row.RecordPosition || 0}`,
        subject: row.Subject,
        siteNumber: row.SiteNumber,
        siteName: row.Site,
        country: country,
        instanceName: row.InstanceName,
        folderName: row.FolderName,
        visitDate: row.VISDAT_RAW,
        visitDateFormatted: row.VISDAT,
        year: row.VISDAT_YYYY,
        month: row.VISDAT_MM,
        day: row.VISDAT_DD,
        visitNotDone: row.VISND === 1,
        dataPageName: row.DataPageName,
        saveTimestamp: row.SaveTS
      };

      visitsArray.push(visit);

      const subject = subjectsMap.get(subjectKey);
      subject.visits.push(visit);
      subject.visitCount++;
      subject.country = country;

      if (visit.visitNotDone) {
        subject.missingVisits++;
      } else {
        subject.completedVisits++;
      }

      if (visit.instanceName) {
        if (visit.instanceName.includes('Screening')) {
          if (!subject.screeningDate) {
            subject.screeningDate = visit.visitDate;
            subject.currentPhase = 'Screening';
          }
        } else if (visit.instanceName.includes('Lymphodepletion')) {
          subject.hasLymphodepletion = true;
          subject.currentPhase = 'Lymphodepletion';
        } else if (visit.instanceName.includes('Cycle')) {
          const cycleMatch = visit.instanceName.match(/Cycle (\d+)/);
          if (cycleMatch) {
            const cycleNum = parseInt(cycleMatch[1]);
            subject.maxCycle = Math.max(subject.maxCycle, cycleNum);
            subject.currentPhase = `Cycle ${cycleNum}`;
          }
        } else if (visit.instanceName.includes('Month')) {
          subject.currentPhase = 'Follow-up';
        } else if (visit.instanceName.includes('EOT')) {
          subject.currentPhase = 'End of Treatment';
        }
      }

      if (visit.visitDate) {
        if (!subject.lastVisitDate || visit.visitDate > subject.lastVisitDate) {
          subject.lastVisitDate = visit.visitDate;
        }
      }
    });

    const countries = Array.from(countriesMap.values()).map(c => ({
      ...c,
      sites: Array.from(c.sites),
      subjects: Array.from(c.subjects),
      siteCount: c.sites.size,
      subjectCount: c.subjects.size
    }));

    const sites = Array.from(sitesMap.values()).map(s => ({
      ...s,
      subjects: Array.from(s.subjects),
      subjectCount: s.subjects.size
    }));

    const subjects = Array.from(subjectsMap.values());

    const summary = {
      totalCountries: countries.length,
      totalSites: sites.length,
      totalSubjects: subjects.length,
      totalVisits: visitsArray.length,
      completedVisits: visitsArray.filter(v => !v.visitNotDone).length,
      missingVisits: visitsArray.filter(v => v.visitNotDone).length,
      subjectsScreening: subjects.filter(s => s.currentPhase === 'Screening').length,
      subjectsInTreatment: subjects.filter(s => s.currentPhase && s.currentPhase.includes('Cycle')).length,
      subjectsInFollowup: subjects.filter(s => s.currentPhase === 'Follow-up').length,
      subjectsCompleted: subjects.filter(s => s.currentPhase === 'End of Treatment').length,
      subjectsWithLymphodepletion: subjects.filter(s => s.hasLymphodepletion).length,
      avgVisitsPerSubject: (visitsArray.length / subjects.length).toFixed(1),
      completionRate: ((subjects.filter(s => s.currentPhase === 'End of Treatment').length / subjects.length) * 100).toFixed(1)
    };

    return {
      project,
      countries,
      sites,
      subjects,
      visits: visitsArray,
      summary,
      raw: rawData
    };
  };

  // ============ NAVIGATION FUNCTIONS ============
  const navigateToProject = useCallback(() => {
    setNavigationState({
      level: 'project',
      selectedProject: processedData?.project.name,
      selectedCountry: null,
      selectedSite: null,
      selectedPatient: null,
      selectedVisit: null,
      breadcrumb: ['Project Overview']
    });
    setShowDetailsPanel(false);
  }, [processedData]);

  const navigateToCountry = useCallback((country) => {
    setNavigationState({
      level: 'country',
      selectedProject: processedData?.project.name,
      selectedCountry: country,
      selectedSite: null,
      selectedPatient: null,
      selectedVisit: null,
      breadcrumb: ['Project Overview', country]
    });
    setShowDetailsPanel(true);
  }, [processedData]);

  const navigateToSite = useCallback((site, country) => {
    setNavigationState({
      level: 'site',
      selectedProject: processedData?.project.name,
      selectedCountry: country,
      selectedSite: site,
      selectedPatient: null,
      selectedVisit: null,
      breadcrumb: ['Project Overview', country || 'Unknown', `Site ${site}`]
    });
    setShowDetailsPanel(true);
  }, [processedData]);

  const navigateToPatient = useCallback((patient) => {
    const patientData = processedData?.subjects.find(s => s.subjectId === patient);
    setNavigationState({
      level: 'patient',
      selectedProject: processedData?.project.name,
      selectedCountry: patientData?.country,
      selectedSite: patientData?.siteNumber,
      selectedPatient: patient,
      selectedVisit: null,
      breadcrumb: ['Project Overview', patientData?.country || 'Unknown',
        `Site ${patientData?.siteNumber}`, patient]
    });
    setShowDetailsPanel(true);
  }, [processedData]);

  const navigateBack = useCallback(() => {
    if (navigationState.level === 'visit') {
      navigateToPatient(navigationState.selectedPatient);
    } else if (navigationState.level === 'patient') {
      navigateToSite(navigationState.selectedSite, navigationState.selectedCountry);
    } else if (navigationState.level === 'site') {
      navigateToCountry(navigationState.selectedCountry);
    } else if (navigationState.level === 'country') {
      navigateToProject();
    }
  }, [navigationState, navigateToProject, navigateToCountry, navigateToSite, navigateToPatient]);

  // ============ DATA FILTERING ============
  const filteredData = useMemo(() => {
    if (!processedData) return { subjects: [], visits: [], sites: [] };

    let filteredSubjects = processedData.subjects;
    let filteredVisits = processedData.visits;
    let filteredSites = processedData.sites;

    if (navigationState.selectedCountry) {
      filteredSubjects = filteredSubjects.filter(s => s.country === navigationState.selectedCountry);
      filteredVisits = filteredVisits.filter(v => v.country === navigationState.selectedCountry);
      filteredSites = filteredSites.filter(s => s.country === navigationState.selectedCountry);
    }

    if (navigationState.selectedSite) {
      filteredSubjects = filteredSubjects.filter(s => s.siteNumber === navigationState.selectedSite);
      filteredVisits = filteredVisits.filter(v => v.siteNumber === navigationState.selectedSite);
    }

    if (navigationState.selectedPatient) {
      filteredVisits = filteredVisits.filter(v => v.subject === navigationState.selectedPatient);
    }

    if (filters.siteGroup !== 'all') {
      filteredSites = filteredSites.filter(s => s.siteGroup === filters.siteGroup);
      const siteNumbers = filteredSites.map(s => s.siteNumber);
      filteredSubjects = filteredSubjects.filter(s => siteNumbers.includes(s.siteNumber));
      filteredVisits = filteredVisits.filter(v => siteNumbers.includes(v.siteNumber));
    }

    if (filters.instanceName !== 'all') {
      filteredVisits = filteredVisits.filter(v => v.instanceName === filters.instanceName);
    }

    if (filters.visitStatus === 'completed') {
      filteredVisits = filteredVisits.filter(v => !v.visitNotDone);
    } else if (filters.visitStatus === 'missing') {
      filteredVisits = filteredVisits.filter(v => v.visitNotDone);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filteredSubjects = filteredSubjects.filter(s =>
        s.subjectId.toLowerCase().includes(term) ||
        s.siteName.toLowerCase().includes(term)
      );
    }

    return { subjects: filteredSubjects, visits: filteredVisits, sites: filteredSites };
  }, [processedData, navigationState, filters]);

  // ============ CALCULATED METRICS ============
  const kpis = useMemo(() => {
    if (!processedData) return {
      sites: 0,
      enrolled: 0,
      inTreatment: 0,
      completed: 0,
      screenFailures: 0,
      avgVisits: 0
    };

    const data = filteredData;
    const subjects = data.subjects;

    return {
      sites: [...new Set(subjects.map(s => s.siteNumber))].length,
      enrolled: subjects.length,
      inTreatment: subjects.filter(s => s.currentPhase && s.currentPhase.includes('Cycle')).length,
      completed: subjects.filter(s => s.currentPhase === 'End of Treatment').length,
      screenFailures: subjects.filter(s => s.currentPhase === 'Screening' && s.missingVisits > 0).length,
      avgVisits: subjects.length > 0
        ? (subjects.reduce((sum, s) => sum + s.completedVisits, 0) / subjects.length).toFixed(1)
        : 0,
      missingVisits: subjects.reduce((sum, s) => sum + s.missingVisits, 0)
    };
  }, [processedData, filteredData]);

  const enrollmentTrend = useMemo(() => {
    if (!filteredData.subjects) return [];
    const monthlyData = {};
    filteredData.subjects.forEach(subject => {
      const firstVisit = subject.visits.find(v => v.year && v.month && !v.visitNotDone);
      if (firstVisit) {
        const monthKey = `${firstVisit.year}-${String(firstVisit.month).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            date: new Date(firstVisit.year, firstVisit.month - 1),
            enrolled: 0
          };
        }
        monthlyData[monthKey].enrolled++;
      }
    });
    return Object.values(monthlyData)
      .sort((a, b) => a.date - b.date)
      .map((item, index, array) => ({
        month: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        enrolled: item.enrolled,
        cumulative: array.slice(0, index + 1).reduce((sum, curr) => sum + curr.enrolled, 0)
      }));
  }, [filteredData]);

  const visitTypeDistribution = useMemo(() => {
    if (!filteredData.visits) return [];
    const distribution = {};
    filteredData.visits.forEach(visit => {
      const type = visit.instanceName || 'Unknown';
      if (!distribution[type]) {
        distribution[type] = { name: type, value: 0, completed: 0, missing: 0 };
      }
      distribution[type].value++;
      if (visit.visitNotDone) {
        distribution[type].missing++;
      } else {
        distribution[type].completed++;
      }
    });
    return Object.values(distribution)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  const countryTreemapData = useMemo(() => {
    if (!processedData) return [];
    return processedData.countries.map(country => ({
      name: country.name,
      size: country.subjectCount,
      sites: country.siteCount,
      visits: country.totalVisits
    }));
  }, [processedData]);

  // ============ UI COMPONENTS ============
  const CompactKPI = ({ icon: Icon, value, label, sublabel, color = "text-gray-900", onClick, isActive }) => (
    <div
      className={`flex-grow basis-1/3 sm:basis-1/4 md:basis-auto flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 border-b sm:border-b-0 sm:border-r border-slate-200 last:border-r-0 hover:bg-slate-50 ${
        isActive ? 'bg-blue-50 border-blue-400' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
      {sublabel && (
        <div className="text-xs text-slate-400">{sublabel}</div>
      )}
    </div>
  );

  const BreadcrumbNav = () => (
    <div className="flex items-center space-x-2 text-sm text-slate-600">
      <button
        onClick={navigateToProject}
        className="flex items-center space-x-1 hover:text-blue-600"
      >
        <Home className="h-4 w-4" />
        <span>Project</span>
      </button>
      {navigationState.breadcrumb.slice(1).map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <button
            className="hover:text-blue-600 font-medium"
            onClick={() => {
              if (index === 0 && navigationState.selectedCountry) {
                navigateToCountry(navigationState.selectedCountry);
              } else if (index === 1 && navigationState.selectedSite) {
                navigateToSite(navigationState.selectedSite, navigationState.selectedCountry);
              }
            }}
          >
            {item}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  const resetDashboard = () => {
    setAppState('upload');
    setProcessedData(null);
    setProcessingLog([]);
    setNavigationState({
      level: 'project',
      selectedProject: null,
      selectedCountry: null,
      selectedSite: null,
      selectedPatient: null,
      selectedVisit: null,
      breadcrumb: ['Project Overview']
    });
    setShowDetailsPanel(false);
    setShowFilterPanel(false);
    setActiveKPIFilter(null);
    setFilters({
      siteGroup: 'all',
      instanceName: 'all',
      visitStatus: 'all',
      dateRange: 'all',
      searchTerm: ''
    });
  };

  // ============ RENDER SCREENS ============
  if (appState === 'upload') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-full shadow-lg">
                <Activity className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">ACE2016-001 Dashboard</h1>
            <p className="text-slate-600">Interactive Clinical Trial Analytics</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Load Visit Report</h2>
              <p className="text-slate-500 mb-6">Data will be fetched directly from Google Drive</p>
              <button
                onClick={loadDataFromDrive}
                disabled={!isPapaReady}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold transition-colors duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                <Zap className="h-5 w-5" />
                <span>{isPapaReady ? 'Load Dashboard' : 'Initializing...'}</span>
              </button>
            </div>
          </div>
          {processingLog.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-2 text-slate-800">Processing Log</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {processingLog.slice(-5).map((log, index) => (
                  <div key={index} className={`text-xs ${
                    log.type === 'error' ? 'text-red-600' :
                    log.type === 'success' ? 'text-green-600' :
                    'text-slate-600'
                  }`}>
                    <span className="font-mono text-slate-400 mr-2">{log.timestamp}</span>{log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (appState === 'processing') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Data</h2>
          <p className="text-slate-600">Analyzing visit records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-slate-900">{processedData?.project.name}</h1>
              <BreadcrumbNav />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search subjects..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm w-full sm:w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm transition-colors duration-200"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {Object.values(filters).filter(v => v !== 'all' && v !== '').length > 0 && (
                  <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded-full">
                    {Object.values(filters).filter(v => v !== 'all' && v !== '').length}
                  </span>
                )}
              </button>
              <button
                onClick={resetDashboard}
                className="flex items-center space-x-2 bg-slate-600 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 text-sm transition-colors duration-200"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex flex-wrap">
          <CompactKPI
            icon={Building2} value={kpis.sites} label="Sites" sublabel="active"
            color="text-blue-600" isActive={activeKPIFilter === 'sites'}
            onClick={() => setActiveKPIFilter(activeKPIFilter === 'sites' ? null : 'sites')}
          />
          <CompactKPI
            icon={Users} value={kpis.enrolled} label="Enrolled" sublabel={`${kpis.inTreatment} active`}
            color="text-green-600" isActive={activeKPIFilter === 'enrolled'}
            onClick={() => setActiveKPIFilter(activeKPIFilter === 'enrolled' ? null : 'enrolled')}
          />
          <CompactKPI
            icon={Activity} value={kpis.inTreatment} label="In Treatment" sublabel={`Cycles 1-3`}
            color="text-purple-600" isActive={activeKPIFilter === 'treatment'}
            onClick={() => setActiveKPIFilter(activeKPIFilter === 'treatment' ? null : 'treatment')}
          />
          <CompactKPI
            icon={CheckCircle} value={kpis.completed} label="Completed" sublabel="EOT"
            color="text-emerald-600" isActive={activeKPIFilter === 'completed'}
            onClick={() => setActiveKPIFilter(activeKPIFilter === 'completed' ? null : 'completed')}
          />
          <CompactKPI
            icon={AlertTriangle} value={kpis.missingVisits} label="Missing" sublabel="visits"
            color="text-yellow-600" isActive={activeKPIFilter === 'missing'}
            onClick={() => setActiveKPIFilter(activeKPIFilter === 'missing' ? null : 'missing')}
          />
          <CompactKPI
            icon={TrendingUp} value={kpis.avgVisits} label="Avg Visits" sublabel="per subject"
            color="text-indigo-600"
          />
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <select
              value={filters.siteGroup}
              onChange={(e) => setFilters(prev => ({ ...prev, siteGroup: e.target.value }))}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-full sm:w-auto"
            >
              <option value="all">All Regions</option>
              {processedData && [...new Set(processedData.sites.map(s => s.siteGroup))].map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            <select
              value={filters.instanceName}
              onChange={(e) => setFilters(prev => ({ ...prev, instanceName: e.target.value }))}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-full sm:w-auto"
            >
              <option value="all">All Visit Types</option>
              {processedData && [...new Set(processedData.visits.map(v => v.instanceName))].sort().map(instance => (
                <option key={instance} value={instance}>{instance}</option>
              ))}
            </select>
            <select
              value={filters.visitStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, visitStatus: e.target.value }))}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-full sm:w-auto"
            >
              <option value="all">All Visits</option>
              <option value="completed">Completed Only</option>
              <option value="missing">Missing Only</option>
            </select>
            <button
              onClick={() => setFilters({ siteGroup: 'all', instanceName: 'all', visitStatus: 'all', dateRange: 'all', searchTerm: ''})}
              className="text-sm text-blue-600 hover:text-blue-800 ml-auto"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {navigationState.level === 'project' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {processedData?.countries.map((country) => {
                  const countrySubjects = processedData.subjects.filter(s => s.country === country.name);
                  const inTreatment = countrySubjects.filter(s => s.currentPhase?.includes('Cycle')).length;
                  const completed = countrySubjects.filter(s => s.currentPhase === 'End of Treatment').length;
                  return (
                    <div key={country.name} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer group" onClick={() => navigateToCountry(country.name)}>
                      <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center space-x-2 text-slate-800">
                              <MapPin className="h-5 w-5 text-blue-500" />
                              <span>{country.name}</span>
                            </h3>
                            <p className="text-sm text-slate-500">{country.region}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                          <div>
                            <div className="text-3xl font-bold text-blue-600">{country.siteCount}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Sites</div>
                          </div>
                          <div>
                            <div className="text-3xl font-bold text-green-600">{country.subjectCount}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Subjects</div>
                          </div>
                          <div>
                            <div className="text-3xl font-bold text-purple-600">{country.totalVisits}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Visits</div>
                          </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">In Treatment</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-slate-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${country.subjectCount > 0 ? (inTreatment / country.subjectCount) * 100 : 0}%` }}/></div>
                              <span className="font-medium w-6 text-right">{inTreatment}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Completed</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-slate-200 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${country.subjectCount > 0 ? (completed / country.subjectCount) * 100 : 0}%` }}/></div>
                              <span className="font-medium w-6 text-right">{completed}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><h3 className="text-lg font-semibold mb-4 text-slate-800">Enrollment Trend</h3><ResponsiveContainer width="100%" height={200}><LineChart data={enrollmentTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="enrolled" stroke="#3B82F6" name="Monthly" strokeWidth={2} /><Line type="monotone" dataKey="cumulative" stroke="#10B981" name="Cumulative" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><h3 className="text-lg font-semibold mb-4 text-slate-800">Country Distribution</h3><ResponsiveContainer width="100%" height={200}><Treemap data={countryTreemapData} dataKey="size" aspectRatio={4/3} stroke="#fff" fill="#3B82F6" onClick={(data) => { if (data && data.name) { navigateToCountry(data.name); } }}><Tooltip content={({ active, payload }) => { if (active && payload && payload[0]) { const data = payload[0].payload; return (<div className="bg-white p-3 border-2 border-blue-300 rounded-lg shadow-lg"><p className="font-bold text-blue-700">{data.name}</p><div className="mt-1 space-y-1"><p className="text-sm">Sites: <span className="font-semibold">{data.sites}</span></p><p className="text-sm">Subjects: <span className="font-semibold">{data.size}</span></p><p className="text-sm">Visits: <span className="font-semibold">{data.visits}</span></p></div><p className="text-xs text-blue-600 mt-2 font-medium">Click to view details →</p></div>); } return null; }} /></Treemap></ResponsiveContainer></div>
              </div>
            </div>
          )}
          {navigationState.level === 'country' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200"><h3 className="text-lg font-semibold">Sites in {navigationState.selectedCountry}</h3><p className="text-sm text-slate-600">Click any site to view patient details</p></div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredData.sites.map(site => {
                    const siteSubjects = filteredData.subjects.filter(s => s.siteNumber === site.siteNumber);
                    const inTreatment = siteSubjects.filter(s => s.currentPhase?.includes('Cycle')).length;
                    const completed = siteSubjects.filter(s => s.currentPhase === 'End of Treatment').length;
                    const missingVisits = siteSubjects.reduce((sum, s) => sum + s.missingVisits, 0);
                    return (
                      <div key={site.siteNumber} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-blue-300 cursor-pointer transition-all duration-200 group" onClick={() => navigateToSite(site.siteNumber, navigationState.selectedCountry)}>
                        <div className="flex justify-between items-start mb-3"><div className="flex-1"><h4 className="font-semibold text-slate-900"><Building2 className="inline h-4 w-4 text-slate-400 mr-2" />Site {site.siteNumber}</h4><p className="text-sm text-slate-600 mt-1">{site.siteName}</p><p className="text-xs text-slate-500">{site.siteGroup}</p></div><ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" /></div>
                        <div className="grid grid-cols-4 gap-2 text-center"><div className="bg-slate-100 rounded p-2"><div className="text-lg font-bold text-blue-600">{siteSubjects.length}</div><div className="text-xs text-slate-500">Total</div></div><div className="bg-green-50 rounded p-2"><div className="text-lg font-bold text-green-600">{inTreatment}</div><div className="text-xs text-slate-500">Active</div></div><div className="bg-purple-50 rounded p-2"><div className="text-lg font-bold text-purple-600">{completed}</div><div className="text-xs text-slate-500">EOT</div></div><div className="bg-yellow-50 rounded p-2"><div className="text-lg font-bold text-yellow-600">{missingVisits}</div><div className="text-xs text-slate-500">Missing</div></div></div>
                      </div>
                    );
                  })}
                </div>
              </div>
          )}
          {navigationState.level === 'site' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm"><div className="p-5 border-b border-slate-200"><h3 className="text-lg font-semibold">Subjects at Site {navigationState.selectedSite}</h3></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Subject</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Phase</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visits</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Missing</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Visit</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{filteredData.subjects.map(subject => (<tr key={subject.subjectId} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigateToPatient(subject.subjectId)}><td className="px-4 py-3 text-sm font-medium text-slate-900">{subject.subjectId}</td><td className="px-4 py-3 text-sm"><span className={`px-2 py-1 text-xs rounded-full ${subject.currentPhase?.includes('Cycle') ? 'bg-green-100 text-green-800' : subject.currentPhase === 'Screening' ? 'bg-blue-100 text-blue-800' : subject.currentPhase === 'End of Treatment' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>{subject.currentPhase || 'Unknown'}</span></td><td className="px-4 py-3 text-sm text-slate-500">{subject.completedVisits}</td><td className="px-4 py-3 text-sm">{subject.missingVisits > 0 ? (<span className="text-yellow-600 font-medium">{subject.missingVisits}</span>) : (<span className="text-slate-400">-</span>)}</td><td className="px-4 py-3 text-sm text-slate-500">{subject.lastVisitDate || '-'}</td><td className="px-4 py-3 text-sm"><button className="text-blue-600 hover:text-blue-800 font-medium">View →</button></td></tr>))}</tbody></table></div></div>
          )}
          {navigationState.level === 'patient' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm"><div className="p-5 border-b border-slate-200"><h3 className="text-lg font-semibold">Visit Timeline for {navigationState.selectedPatient}</h3></div><div className="p-5"><div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">{(() => { const patient = processedData?.subjects.find(s => s.subjectId === navigationState.selectedPatient); if (!patient) return <div>No patient data found</div>; return patient.visits.map((visit, index) => (<div key={`${visit.visitId}-${index}`} className={`flex items-center space-x-4 p-3 rounded-lg border ${visit.visitNotDone ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}><div className="flex-shrink-0"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${visit.visitNotDone ? 'bg-red-200 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{index + 1}</div></div><div className="flex-1"><div className="font-medium text-slate-800">{visit.instanceName}</div><div className="text-sm text-slate-500">{visit.folderName} • {visit.visitDate || 'No date'}</div></div>{visit.visitNotDone && (<span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Not Done</span>)}<div className="text-xs text-slate-400">{visit.saveTimestamp}</div></div>));})()}</div></div></div>
          )}
        </div>

        {/* Details Panel */}
        {showDetailsPanel && <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={() => setShowDetailsPanel(false)}></div>}
        <aside className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white border-l border-slate-200 shadow-xl overflow-y-auto z-20 transform transition-transform duration-300 ease-in-out ${showDetailsPanel ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 lg:max-w-xs xl:max-w-sm`}>
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Details</h3>
              <button onClick={() => setShowDetailsPanel(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-6">
                {navigationState.level === 'country' && (() => {
                  const country = processedData?.countries.find(c => c.name === navigationState.selectedCountry); if (!country) return null;
                  const countrySubjects = filteredData.subjects; const screening = countrySubjects.filter(s => s.currentPhase === 'Screening').length; const treatment = countrySubjects.filter(s => s.currentPhase?.includes('Cycle')).length; const completed = countrySubjects.filter(s => s.currentPhase === 'End of Treatment').length;
                  return (<div className="space-y-6"><div><h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Country Overview</h4><div className="space-y-2 bg-slate-50 p-3 rounded-lg"> <div className="flex justify-between text-sm"><span>Region</span><span className="font-medium">{country.region}</span></div><div className="flex justify-between text-sm"><span>Total Sites</span><span className="font-medium">{country.siteCount}</span></div><div className="flex justify-between text-sm"><span>Total Subjects</span><span className="font-medium">{country.subjectCount}</span></div></div></div><div><h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Subject Status</h4><div className="space-y-2"><div className="flex items-center justify-between text-sm"><span>Screening</span><div className="flex items-center space-x-2"><div className="w-24 bg-slate-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(screening / country.subjectCount) * 100}%` }} /></div><span className="font-medium w-6 text-right">{screening}</span></div></div><div className="flex items-center justify-between text-sm"><span>Treatment</span><div className="flex items-center space-x-2"><div className="w-24 bg-slate-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${(treatment / country.subjectCount) * 100}%` }} /></div><span className="font-medium w-6 text-right">{treatment}</span></div></div><div className="flex items-center justify-between text-sm"><span>Completed</span><div className="flex items-center space-x-2"><div className="w-24 bg-slate-200 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(completed / country.subjectCount) * 100}%` }} /></div><span className="font-medium w-6 text-right">{completed}</span></div></div></div></div></div>);
                })()}
                {navigationState.level === 'site' && (() => {
                  const site = processedData?.sites.find(s => s.siteNumber === navigationState.selectedSite); if (!site) return null; const siteSubjects = filteredData.subjects;
                  return (<div className="space-y-6"><div><h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Site Information</h4><div className="space-y-3 bg-slate-50 p-3 rounded-lg"><div><span className="text-xs text-slate-500">Site Name</span><p className="text-sm font-medium">{site.siteName}</p></div><div><span className="text-xs text-slate-500">Country</span><p className="text-sm font-medium">{site.country}</p></div><div><span className="text-xs text-slate-500">Region</span><p className="text-sm font-medium">{site.siteGroup}</p></div></div></div><div><h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Performance</h4><div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 p-3 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{siteSubjects.length}</div><div className="text-xs text-slate-500">Subjects</div></div><div className="bg-slate-50 p-3 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{site.visits}</div><div className="text-xs text-slate-500">Visits</div></div></div></div></div>);
                })()}
                {navigationState.level === 'patient' && (() => {
                  const patient = processedData?.subjects.find(s => s.subjectId === navigationState.selectedPatient); if (!patient) return null;
                  return (<div className="space-y-6"><div><h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Patient Information</h4><div className="space-y-2 bg-slate-50 p-3 rounded-lg"><div className="flex justify-between"><span>Subject ID</span><span className="font-medium">{patient.subjectId}</span></div><div className="flex justify-between"><span>Site</span><span className="font-medium">{patient.siteNumber}</span></div><div className="flex justify-between items-center"><span>Current Phase</span><span className={`px-2 py-1 text-xs font-semibold rounded-full ${patient.currentPhase?.includes('Cycle') ? 'bg-green-100 text-green-800' : patient.currentPhase === 'End of Treatment' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>{patient.currentPhase || 'Unknown'}</span></div></div></div><div><h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Visit Summary</h4><div className="grid grid-cols-2 gap-3"><div className="bg-blue-50 p-3 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{patient.completedVisits}</div><div className="text-xs text-slate-500">Completed</div></div><div className="bg-yellow-50 p-3 rounded-lg text-center"><div className="text-2xl font-bold text-yellow-600">{patient.missingVisits}</div><div className="text-xs text-slate-500">Missing</div></div></div></div><div><h4 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Timeline</h4><div className="space-y-2 bg-slate-50 p-3 rounded-lg text-sm"><div className="flex justify-between"><span>First Visit</span><span className="font-medium">{patient.screeningDate || 'N/A'}</span></div><div className="flex justify-between"><span>Last Visit</span><span className="font-medium">{patient.lastVisitDate || 'N/A'}</span></div><div className="flex justify-between"><span>Max Cycle</span><span className="font-medium">{patient.maxCycle > 0 ? `Cycle ${patient.maxCycle}` : 'Pre-treatment'}</span></div></div></div></div>);
                })()}
              </div>
        </aside>
      </main>

      {navigationState.level !== 'project' && (
        <div className="fixed bottom-4 right-4 z-10">
          <button onClick={navigateBack} className="flex items-center space-x-2 bg-white border border-slate-300 shadow-lg rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors duration-200">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ACE2016Dashboard;
