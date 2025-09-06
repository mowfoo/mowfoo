import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';
import { AlertCircle, Package, TrendingUp, Users, Thermometer, RefreshCw, Lock, Edit3, X, TrendingDown, Search, Upload, Info, Settings, Bell, Database, Truck, Calendar, Eye, ChevronRight, CheckCircle, Clock, FileText, MapPin, Activity, AlertTriangle, BarChart3, Filter, Download, ChevronDown, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import _ from 'lodash';

const IPInventoryDashboard = () => {
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProduct, setSelectedProduct] = useState('ACE2016');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', type: '', data: null });
  const [vialSearch, setVialSearch] = useState('');
  const [dataSource, setDataSource] = useState('demo');
  const [excelData, setExcelData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [inferredInventory, setInferredInventory] = useState(null);
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  // Initialize with demo data
  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = () => {
    const demoData = generateDemoData();
    setExcelData(demoData);
    const processed = processDataForDashboard(demoData);
    setProcessedData(processed);
    setDataSource('demo');
  };

  const generateDemoData = () => {
    const shipments = [];
    const treatments = [];
    const vialIds = [];

    // Generate comprehensive shipment data with vial tracking
    const months = [
      { date: '2024-07-15', count: 22 },
      { date: '2024-08-15', count: 28 },
      { date: '2024-09-15', count: 24 },
      { date: '2024-10-15', count: 30 },
      { date: '2025-02-15', count: 55 },
      { date: '2025-03-15', count: 12 },
      { date: '2025-04-15', count: 18 },
      { date: '2025-05-15', count: 25 },
      { date: '2025-06-15', count: 15 },
      { date: '2025-07-15', count: 8 },
      { date: '2025-08-15', count: 34 }
    ];

    let vialCounter = 1;
    const sites = ['SCRI Oncology Partners', 'Presbyterian/St.Luke\'s', 'US Oncology', 'Taichung Veterans'];
    const depots = ['Acepodia TW', 'CryoGene Lab'];

    months.forEach(month => {
      for (let i = 0; i < month.count; i++) {
        const date = new Date(month.date);
        date.setDate(date.getDate() + Math.floor(Math.random() * 15));
        const vialId = `22011-${String(vialCounter++).padStart(3, '0')}`;
        vialIds.push(vialId);

        // Create multi-step journey for some vials
        const journeySteps = Math.random() > 0.7 ? 2 : 1;
        let currentLocation = depots[Math.floor(Math.random() * depots.length)];

        for (let step = 0; step < journeySteps; step++) {
          const nextLocation = step === journeySteps - 1
            ? sites[Math.floor(Math.random() * sites.length)]
            : depots[(depots.indexOf(currentLocation) + 1) % depots.length];

          shipments.push({
            'Delivery Date': new Date(date.getTime() + step * 24 * 60 * 60 * 1000),
            'Product#': Math.random() > 0.9 ? 'ACE1831' : 'ACE2016',
            'Vial ID': vialId,
            'Box ID': `BOX-${String(Math.floor(vialCounter/10)).padStart(3, '0')}`,
            'From_Location': currentLocation,
            'Action': 'Transfer to',
            'To_Location': nextLocation,
            'Transfer Type': currentLocation.includes('Site') || nextLocation.includes('Site')
              ? 'Depot to Site'
              : 'Depot to Depot',
            'MTF No.': `24-${String(vialCounter + step).padStart(3, '0')}`,
            'Shipment Tracking No.': `TR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            'Remark': Math.random() > 0.95 ? 'Temperature excursion noted' : null,
            'Recorded by': ['David Lin', 'Sarah Chen', 'John Smith'][Math.floor(Math.random() * 3)]
          });

          currentLocation = nextLocation;
        }
      }
    });

    // Generate treatment data linking vials to patients
    const treatedVials = vialIds.slice(0, Math.floor(vialIds.length * 0.3));
    treatedVials.forEach((vialId, idx) => {
      const siteIndex = idx % 4;
      const treatmentDate = new Date();
      treatmentDate.setDate(treatmentDate.getDate() - Math.floor(Math.random() * 90));

      treatments.push({
        'Product': 'ACE2016',
        'Vial ID': vialId,
        'Treatment Date': treatmentDate,
        'Treatment Cycle': `Cycle ${Math.floor(idx / 4) + 1}`,
        'Site No': 101 + siteIndex,
        'Site Name': sites[siteIndex],
        'Patient ID': `${101 + siteIndex}-${String(Math.floor(idx / 4) + 1).padStart(3, '0')}`,
        'Remark': idx % 10 === 0 ? 'Adverse event noted' : null
      });
    });

    return {
      shipments,
      treatments,
      vialJourneys: processVialJourneys(shipments, treatments),
      inventory: inferInventoryFromShipments(shipments, treatments)
    };
  };

  // NEW: Infer inventory from shipment records
  const inferInventoryFromShipments = (shipments, treatments) => {
    // Track current location of each vial based on last shipment
    const vialLocations = {};
    const locationInventory = {};

    // Process all shipments to determine current vial locations
    shipments.forEach(ship => {
      const vialId = ship['Vial ID'];
      const toLocation = ship['To_Location'];

      // Update vial's current location
      vialLocations[vialId] = {
        location: toLocation,
        product: ship['Product#'],
        boxId: ship['Box ID'],
        lastMovement: ship['Delivery Date'],
        from: ship['From_Location'],
        tracking: ship['Shipment Tracking No.']
      };
    });

    // Check which vials have been administered
    const administeredVials = new Set(treatments.map(t => t['Vial ID']));

    // Count vials at each location (excluding administered ones)
    Object.entries(vialLocations).forEach(([vialId, info]) => {
      if (!administeredVials.has(vialId)) {
        const loc = info.location;
        if (!locationInventory[loc]) {
          locationInventory[loc] = {
            ACE2016: { count: 0, vials: [], lots: {} },
            ACE1831: { count: 0, vials: [], lots: {} }
          };
        }

        const product = info.product || 'ACE2016';
        locationInventory[loc][product].count++;
        locationInventory[loc][product].vials.push({
          vialId,
          boxId: info.boxId,
          lastMovement: info.lastMovement,
          from: info.from,
          tracking: info.tracking
        });

        // Extract lot number from vial ID
        const lotMatch = vialId.match(/^(\d+)/);
        if (lotMatch) {
          const lot = `Lot #${lotMatch[1]}`;
          locationInventory[loc][product].lots[lot] = (locationInventory[loc][product].lots[lot] || 0) + 1;
        }
      }
    });

    // Format for dashboard display
    const depots = [];
    const sites = [];

    Object.entries(locationInventory).forEach(([location, products]) => {
      const isDepot = location.includes('Acepodia') || location.includes('CryoGene');
      const entry = {
        location: location,
        name: location,
        ACE2016: products.ACE2016.count,
        ACE1831: products.ACE1831.count,
        total: products.ACE2016.count + products.ACE1831.count,
        lots: { ...products.ACE2016.lots, ...products.ACE1831.lots },
        vialDetails: {
          ACE2016: products.ACE2016.vials,
          ACE1831: products.ACE1831.vials
        },
        status: products.ACE2016.count + products.ACE1831.count <= 2 ?
                (products.ACE2016.count + products.ACE1831.count === 0 ? 'Critical' : 'Low') : 'OK'
      };

      if (isDepot) {
        depots.push(entry);
      } else {
        sites.push({
          ...entry,
          id: location.includes('SCRI') ? 101 :
              location.includes('Presbyterian') ? 102 :
              location.includes('US Oncology') ? 103 :
              location.includes('Taichung') ? 207 :
              location.includes('Norton') ? 104 :
              location.includes('Queen Mary') ? 105 :
              location.includes('Advent') ? 106 :
              location.includes('National Taiwan') ? 107 : 100,
          stock: entry.total
        });
      }
    });

    return { depots, sites, locationInventory };
  };

  const processVialJourneys = (shipments, treatments) => {
    const journeys = new Map();

    // Build journey from shipments
    shipments.forEach(ship => {
      const vialId = ship['Vial ID'];
      if (!journeys.has(vialId)) {
        journeys.set(vialId, {
          vialId,
          product: ship['Product#'],
          movements: [],
          patient: null,
          status: 'In Transit'
        });
      }

      journeys.get(vialId).movements.push({
        date: ship['Delivery Date'],
        from: ship['From_Location'],
        to: ship['To_Location'],
        type: ship['Transfer Type'],
        tracking: ship['Shipment Tracking No.'],
        mtf: ship['MTF No.']
      });
    });

    // Add treatment data
    treatments.forEach(treat => {
      const vialId = treat['Vial ID'];
      if (journeys.has(vialId)) {
        journeys.get(vialId).patient = treat['Patient ID'];
        journeys.get(vialId).treatmentDate = treat['Treatment Date'];
        journeys.get(vialId).treatmentSite = treat['Site Name'];
        journeys.get(vialId).status = 'Administered';
      }
    });

    return journeys;
  };

  const processDataForDashboard = (rawData) => {
    if (!rawData) return null;

    // Group shipments by month
    const monthlyShipments = _.groupBy(rawData.shipments, ship => {
      const date = new Date(ship['Delivery Date']);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });

    // Create trend data with detailed vial information
    const trendData = Object.entries(monthlyShipments).map(([key, ships]) => {
      const [year, month] = key.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'short' });
      const returns = ships.filter(s => s.Remark && s.Remark.includes('return')).length;

      // Group by product for this month
      const productBreakdown = _.groupBy(ships, 'Product#');

      return {
        month: `${monthName} ${year}`,
        monthKey: key,
        shipments: ships.length - returns,
        returns,
        ACE2016: (productBreakdown['ACE2016'] || []).length,
        ACE1831: (productBreakdown['ACE1831'] || []).length,
        vialDetails: ships.map(s => ({
          vialId: s['Vial ID'],
          product: s['Product#'],
          from: s['From_Location'],
          to: s['To_Location'],
          tracking: s['Shipment Tracking No.'],
          date: s['Delivery Date']
        }))
      };
    }).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Process transfer types with detailed breakdown
    const transferTypes = _.countBy(rawData.shipments, 'Transfer Type');
    const total = Object.values(transferTypes).reduce((sum, count) => sum + count, 0);

    const transferData = Object.entries(transferTypes).map(([type, count]) => {
      const typeShipments = rawData.shipments.filter(s => s['Transfer Type'] === type);
      const byProduct = _.groupBy(typeShipments, 'Product#');

      return {
        name: type || 'Other',
        value: count,
        percentage: Math.round((count / total) * 100),
        ACE2016: (byProduct['ACE2016'] || []).length,
        ACE1831: (byProduct['ACE1831'] || []).length,
        color: type?.includes('Site') ? '#10B981' : type?.includes('Depot') ? '#3B82F6' : '#F59E0B',
        vials: typeShipments.slice(0, 20).map(s => ({
          vialId: s['Vial ID'],
          product: s['Product#'],
          from: s['From_Location'],
          to: s['To_Location'],
          date: s['Delivery Date'],
          status: rawData.vialJourneys?.get(s['Vial ID'])?.status || 'In Transit'
        }))
      };
    });

    // Calculate administered vials
    const administeredCount = rawData.treatments?.length || 0;
    const totalVials = rawData.vialJourneys?.size || 0;
    const activeVials = totalVials - administeredCount;

    return {
      monthlyTrends: trendData.slice(-12),
      transferTypes: transferData,
      vialJourneys: rawData.vialJourneys,
      inventory: rawData.inventory,
      totalShipments: rawData.shipments.length,
      totalTreatments: rawData.treatments.length,
      totalVials: totalVials,
      activeVials: activeVials,
      administeredVials: administeredCount
    };
  };

  // Handle Excel file upload - Enhanced version
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, {
        cellDates: true,
        cellStyles: true,
        cellFormulas: true,
        cellNF: true,
        sheetStubs: true
      });

      // Extract data from Shipment sheet with proper headers
      const shipmentSheet = workbook.Sheets['Shipment'];
      const shipmentData = XLSX.utils.sheet_to_json(shipmentSheet, { header: 1 });

      const shipmentHeaders = ['Delivery Date', 'Product#', 'Vial ID', 'Box ID', 'From_Location',
                              'Action', 'To_Location', 'Transfer Type', 'MTF No.',
                              'Shipment Tracking No.', 'Remark', 'Recorded by'];

      const shipments = [];
      for (let i = 2; i < shipmentData.length; i++) {
        const row = shipmentData[i];
        if (row[0]) {
          const record = {};
          shipmentHeaders.forEach((header, index) => {
            record[header] = row[index];
          });
          shipments.push(record);
        }
      }

      // Extract data from Treatment sheet with proper headers
      const treatmentSheet = workbook.Sheets['Treatment'];
      const treatmentData = XLSX.utils.sheet_to_json(treatmentSheet, { header: 1 });

      const treatmentHeaders = ['Product', 'Vial ID', 'Treatment Date', 'Treatment Cycle',
                               'Site No', 'Site Name', 'Patient ID', 'Remark'];

      const treatments = [];
      for (let i = 2; i < treatmentData.length; i++) {
        const row = treatmentData[i];
        if (row[0] && row[1]) {
          const record = {};
          treatmentHeaders.forEach((header, index) => {
            record[header] = row[index];
          });
          treatments.push(record);
        }
      }

      // INFER inventory from shipments instead of reading inventory tabs
      const inferredInv = inferInventoryFromShipments(shipments, treatments);

      // Still parse the inventory tabs for comparison/discrepancy analysis
      const ace2016Sheet = workbook.Sheets['ACE2016'];
      const ace2016Data = XLSX.utils.sheet_to_json(ace2016Sheet, { header: 1 });

      const ace1831Sheet = workbook.Sheets['ACE1831'];
      const ace1831Data = XLSX.utils.sheet_to_json(ace1831Sheet, { header: 1 });

      // Parse reported inventory for discrepancy analysis
      const reportedInventory = {
        ACE2016: {
          'Acepodia TW': {
            'Lot #22011': typeof ace2016Data[3]?.[1] === 'number' ? ace2016Data[3][1] : 0,
            'Lot #24004': typeof ace2016Data[3]?.[2] === 'number' ? ace2016Data[3][2] : 0,
            'Lot #24011': typeof ace2016Data[3]?.[3] === 'number' ? ace2016Data[3][3] : 0,
            'Lot #25004': typeof ace2016Data[3]?.[4] === 'number' ? ace2016Data[3][4] : 0
          },
          'CryoGene Lab': {
            'Lot #22011': typeof ace2016Data[4]?.[1] === 'number' ? ace2016Data[4][1] : 0,
            'Lot #24004': typeof ace2016Data[4]?.[2] === 'number' ? ace2016Data[4][2] : 0,
            'Lot #24011': typeof ace2016Data[4]?.[3] === 'number' ? ace2016Data[4][3] : 0,
            'Lot #25004': typeof ace2016Data[4]?.[4] === 'number' ? ace2016Data[4][4] : 0
          }
        },
        ACE1831: {
          'Acepodia TW': {
            'Lot #21032': typeof ace1831Data[3]?.[1] === 'number' ? ace1831Data[3][1] : 0,
            'Lot #22007': typeof ace1831Data[3]?.[2] === 'number' ? ace1831Data[3][2] : 0,
            'Lot #24014': typeof ace1831Data[3]?.[3] === 'number' ? ace1831Data[3][3] : 0
          },
          'CryoGene Lab': {
            'Lot #21032': typeof ace1831Data[4]?.[1] === 'number' ? ace1831Data[4][1] : 0,
            'Lot #22007': typeof ace1831Data[4]?.[2] === 'number' ? ace1831Data[4][2] : 0,
            'Lot #24014': typeof ace1831Data[4]?.[3] === 'number' ? ace1831Data[4][3] : 0
          }
        }
      };

      // Calculate discrepancies
      const discrepancies = calculateDiscrepancies(inferredInv, reportedInventory, shipments);

      // Create the final data structure
      const excelData = {
        shipments,
        treatments,
        vialJourneys: processVialJourneys(shipments, treatments),
        inventory: inferredInv, // Use inferred inventory as primary
        reportedInventory: reportedInventory,
        discrepancies: discrepancies
      };

      setExcelData(excelData);
      setInferredInventory(inferredInv);
      setProcessedData(processDataForDashboard(excelData));
      setDataSource('excel');

      // Show success notification with warning about discrepancies
      const totalDiscrepancy = Math.abs(discrepancies.ACE2016.totalDiscrepancy) +
                              Math.abs(discrepancies.ACE1831.totalDiscrepancy);

      setNotifications([{
        id: Date.now(),
        type: totalDiscrepancy > 0 ? 'warning' : 'success',
        message: `Loaded ${shipments.length} shipments. ${totalDiscrepancy > 0 ?
                 `WARNING: ${totalDiscrepancy} vials discrepancy detected!` :
                 'Inventory matches shipments.'}`
      }]);
      setShowNotifications(true);
      setTimeout(() => setShowNotifications(false), 5000);

    } catch (error) {
      console.error('Error loading Excel:', error);
      alert('Error loading Excel file. Please check the file format.');
    }
    setLoading(false);
  };

  // Calculate discrepancies between inferred and reported inventory
  const calculateDiscrepancies = (inferred, reported, shipments) => {
    const discrepancies = {
      ACE2016: {
        locations: {},
        totalDiscrepancy: 0
      },
      ACE1831: {
        locations: {},
        totalDiscrepancy: 0
      }
    };

    // Get unique products from shipments
    const productShipments = _.groupBy(shipments, 'Product#');

    ['ACE2016', 'ACE1831'].forEach(product => {
      const productVials = _.uniq((productShipments[product] || []).map(s => s['Vial ID']));
      const vialLocations = {};

      // Track current locations from shipments
      (productShipments[product] || []).forEach(ship => {
        vialLocations[ship['Vial ID']] = ship['To_Location'];
      });

      const locationCounts = _.countBy(Object.values(vialLocations));

      // Compare with reported inventory
      ['Acepodia TW', 'CryoGene Lab'].forEach(depot => {
        const inferredCount = locationCounts[depot] || 0;
        const reportedCount = Object.values(reported[product]?.[depot] || {})
          .reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);

        discrepancies[product].locations[depot] = {
          inferred: inferredCount,
          reported: reportedCount,
          difference: inferredCount - reportedCount
        };

        discrepancies[product].totalDiscrepancy += (inferredCount - reportedCount);
      });
    });

    return discrepancies;
  };

  // Get inventory data for charts - now using inferred inventory
  const getInventoryData = () => {
    if (!processedData?.inventory) return [];

    const data = [];
    const inventory = processedData.inventory;

    // Add depot data
    (inventory.depots || []).forEach(depot => {
      const productCount = selectedProduct === 'ACE2016' ? depot.ACE2016 : depot.ACE1831;
      data.push({
        location: depot.location.replace(' Lab', ''),
        value: productCount || 0,
        type: 'depot',
        total: depot.total || 0,
        details: depot.vialDetails
      });
    });

    // Add site data
    (inventory.sites || []).forEach(site => {
      const productCount = selectedProduct === 'ACE2016' ? site.ACE2016 : site.ACE1831;
      if (productCount > 0) {
        data.push({
          location: site.name?.length > 15 ? `Site ${site.id}` : site.name,
          value: productCount || 0,
          type: 'site',
          total: site.total || 0,
          details: site.vialDetails
        });
      }
    });

    return data;
  };

  // Get discrepancy data for visualization
  const getDiscrepancyData = () => {
    if (!excelData?.discrepancies) return [];

    const disc = excelData.discrepancies[selectedProduct];
    if (!disc) return [];

    return Object.entries(disc.locations).map(([location, data]) => ({
      location: location.replace(' Lab', ''),
      inferred: data.inferred,
      reported: data.reported,
      difference: data.difference
    }));
  };

  // Search for specific vial
  const searchVial = () => {
    if (!vialSearch) return;

    const journey = excelData?.vialJourneys?.get(vialSearch);

    if (journey) {
      setModalContent({
        title: `Vial ${vialSearch} - Complete Journey`,
        type: 'vialJourney',
        data: journey
      });
      setShowModal(true);
    } else {
      alert(`Vial ${vialSearch} not found`);
    }
  };

  // INTERACTIVE HANDLERS

  // Handle inventory bar click
  const handleInventoryClick = (data) => {
    if (!data || !data.activeLabel) return;

    const location = data.activeLabel;
    const locationData = processedData.inventory.depots.find(d => d.location.includes(location)) ||
                        processedData.inventory.sites.find(s => s.name.includes(location));

    if (locationData) {
      const vialDetails = locationData.vialDetails?.[selectedProduct] || [];

      setModalContent({
        title: `${location} - ${selectedProduct} Inventory Details`,
        type: 'locationInventory',
        data: {
          location,
          product: selectedProduct,
          vials: vialDetails,
          totalCount: selectedProduct === 'ACE2016' ? locationData.ACE2016 : locationData.ACE1831,
          lots: locationData.lots,
          discrepancy: excelData?.discrepancies?.[selectedProduct]?.locations?.[location]
        }
      });
      setShowModal(true);
    }
  };

  // Handle shipment trend click
  const handleTrendClick = (data) => {
    if (!data || !data.activeLabel) return;

    const monthData = processedData.monthlyTrends.find(m => m.month === data.activeLabel);
    if (monthData) {
      setModalContent({
        title: `${monthData.month} - Shipment Details`,
        type: 'monthlyShipments',
        data: {
          month: monthData.month,
          totalShipments: monthData.shipments + monthData.returns,
          ACE2016: monthData.ACE2016,
          ACE1831: monthData.ACE1831,
          returns: monthData.returns,
          vials: monthData.vialDetails
        }
      });
      setShowModal(true);
    }
  };

  // Handle transfer type click
  const handleTransferClick = (data) => {
    if (!data) return;

    const transferData = processedData.transferTypes.find(t => t.name === data.name);
    if (transferData) {
      setModalContent({
        title: `${transferData.name} Transfer Details`,
        type: 'transferDetails',
        data: {
          type: transferData.name,
          total: transferData.value,
          ACE2016: transferData.ACE2016,
          ACE1831: transferData.ACE1831,
          percentage: transferData.percentage,
          vials: transferData.vials
        }
      });
      setShowModal(true);
    }
  };

  // Custom tooltips
  const CustomInventoryTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg" style={{ pointerEvents: 'none' }}>
          <p className="font-semibold text-sm">{data.location}</p>
          <p className="text-xs text-gray-600">{selectedProduct}: {data.value} vials</p>
          {data.total > data.value && (
            <p className="text-xs text-gray-500">Total (all products): {data.total}</p>
          )}
          <p className="text-xs text-blue-600 mt-1">Click for details</p>
        </div>
      );
    }
    return null;
  };

  const CustomTrendTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg" style={{ pointerEvents: 'none' }}>
          <p className="font-semibold text-sm">{data.month}</p>
          <p className="text-xs text-gray-600">Shipments: {data.shipments}</p>
          <p className="text-xs text-gray-600">Returns: {data.returns}</p>
          <p className="text-xs text-blue-600 mt-1">Click to view details</p>
        </div>
      );
    }
    return null;
  };

  const CustomTransferTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg" style={{ pointerEvents: 'none' }}>
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-xs text-gray-600">Total: {data.value} ({data.percentage}%)</p>
          <p className="text-xs text-gray-600">ACE2016: {data.ACE2016}</p>
          <p className="text-xs text-gray-600">ACE1831: {data.ACE1831}</p>
          <p className="text-xs text-blue-600 mt-1">Click for details</p>
        </div>
      );
    }
    return null;
  };

  if (!processedData) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
      {/* Fixed Header */}
      <nav className="sticky top-0 z-40 bg-white shadow-md border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Package className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">IP Inventory - Real-Time Tracking</h1>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
              Shipment-Based
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Product Selector */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              <option value="ACE2016">ACE2016</option>
              <option value="ACE1831">ACE1831</option>
            </select>

            {/* Vial Search */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Track Vial ID..."
                value={vialSearch}
                onChange={(e) => setVialSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchVial()}
                className="px-3 py-1 border rounded-lg text-sm w-36"
              />
              <button
                onClick={searchVial}
                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Discrepancy Toggle */}
            {dataSource === 'excel' && (
              <button
                onClick={() => setShowDiscrepancy(!showDiscrepancy)}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center ${
                  showDiscrepancy ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                {showDiscrepancy ? 'Hide' : 'Show'} Discrepancies
              </button>
            )}

            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
              <Database className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-700">
                {dataSource === 'excel' ? 'Excel Data' : 'Demo Data'}
              </span>
            </div>

            <label className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 flex items-center cursor-pointer">
              <Upload className="w-4 h-4 mr-1" />
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={loadDemoData}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Reset
            </button>
          </div>
        </div>
      </nav>

      {/* Notifications */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed top-16 right-4 z-50 space-y-2">
          {notifications.map(notif => (
            <div key={notif.id} className={`p-3 rounded-lg shadow-lg flex items-center ${
              notif.type === 'success' ? 'bg-green-100 text-green-800' :
              notif.type === 'warning' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {notif.type === 'warning' && <AlertTriangle className="w-5 h-5 mr-2" />}
              <p className="text-sm">{notif.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Content - Scrollable */}
      <div className="p-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-6 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold">{processedData.totalShipments}</p>
            <p className="text-xs text-gray-600">Shipments</p>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-gray-500">Tracked</span>
            </div>
            <p className="text-2xl font-bold">{processedData.totalVials || 0}</p>
            <p className="text-xs text-gray-600">Unique Vials</p>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-xs text-gray-500">Active</span>
            </div>
            <p className="text-2xl font-bold">{processedData.activeVials || 0}</p>
            <p className="text-xs text-gray-600">In Inventory</p>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span className="text-xs text-gray-500">Used</span>
            </div>
            <p className="text-2xl font-bold">{processedData.administeredVials || 0}</p>
            <p className="text-xs text-gray-600">Administered</p>
          </div>

          {/* Discrepancy Alert Card */}
          {dataSource === 'excel' && excelData?.discrepancies && (
            <div className="bg-white rounded-xl p-3 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-gray-500">Alert</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {Math.abs(excelData.discrepancies[selectedProduct]?.totalDiscrepancy || 0)}
              </p>
              <p className="text-xs text-gray-600">Discrepancy</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-3 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <Thermometer className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-gray-500">Temp</span>
            </div>
            <p className="text-2xl font-bold">-125°C</p>
            <p className="text-xs text-gray-600">Maintained</p>
          </div>
        </div>

        {/* Interactive Charts */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Inventory Distribution - CLICKABLE */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-blue-600" />
              {selectedProduct} Real Inventory
              <span className="ml-auto text-xs text-green-600">Click bars for details</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={getInventoryData()}
                onClick={handleInventoryClick}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomInventoryTooltip />} />
                <Bar
                  dataKey="value"
                  fill="#10B981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-3 p-2 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600">
                Based on {processedData.totalShipments} shipment records
              </p>
            </div>
          </div>

          {/* Shipment Trends - CLICKABLE */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              Shipment Trends
              <span className="ml-auto text-xs text-blue-600">Click points for details</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={processedData.monthlyTrends}
                onClick={handleTrendClick}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="shipments"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4, cursor: 'pointer' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="returns"
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Transfer Analysis - CLICKABLE */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center">
              <Truck className="w-4 h-4 mr-2 text-purple-600" />
              Transfer Analysis
              <span className="ml-auto text-xs text-purple-600">Click for details</span>
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={processedData.transferTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  onClick={handleTransferClick}
                  style={{ cursor: 'pointer' }}
                >
                  {processedData.transferTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTransferTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-2">
              {processedData.transferTypes.map((type, idx) => (
                <div
                  key={idx}
                  className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
                  onClick={() => handleTransferClick(type)}
                >
                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: type.color }} />
                  <span className="text-xs">{type.name} ({type.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Location Details Table - EXPANDABLE */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
            {selectedProduct} Inventory Details (Inferred from Shipments)
            <span className="ml-auto text-xs text-indigo-600">Click rows to expand</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-center p-2">Shipments Show</th>
                  {dataSource === 'excel' && (
                    <>
                      <th className="text-center p-2">Inventory Tab</th>
                      <th className="text-center p-2">Discrepancy</th>
                    </>
                  )}
                  <th className="text-left p-2">Status</th>
                  <th className="text-center p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Show depot data */}
                {(processedData.inventory?.depots || []).map((depot, idx) => {
                  const productCount = selectedProduct === 'ACE2016' ? depot.ACE2016 : depot.ACE1831;
                  const disc = excelData?.discrepancies?.[selectedProduct]?.locations?.[depot.location];
                  const isExpanded = expandedRows[`depot-${idx}`];
                  const vialDetails = depot.vialDetails?.[selectedProduct] || [];

                  return (
                    <React.Fragment key={`depot-${idx}`}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{depot.location}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Depot</span>
                        </td>
                        <td className="p-2 text-center font-semibold text-green-600">{productCount}</td>
                        {dataSource === 'excel' && disc && (
                          <>
                            <td className="p-2 text-center text-orange-600">{disc.reported}</td>
                            <td className="p-2 text-center">
                              {disc.difference !== 0 && (
                                <span className={`font-semibold ${disc.difference > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                  {disc.difference > 0 ? '+' : ''}{disc.difference}
                                </span>
                              )}
                            </td>
                          </>
                        )}
                        {dataSource !== 'excel' && (
                          <>
                            <td className="p-2 text-center">-</td>
                            <td className="p-2 text-center">-</td>
                          </>
                        )}
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            productCount === 0 ? 'bg-red-100 text-red-700' :
                            productCount <= 10 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {productCount === 0 ? 'Empty' : productCount <= 10 ? 'Low' : 'OK'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {productCount > 0 && (
                            <button
                              onClick={() => {
                                setModalContent({
                                  title: `${depot.location} - ${selectedProduct} Inventory`,
                                  type: 'locationInventory',
                                  data: {
                                    location: depot.location,
                                    product: selectedProduct,
                                    vials: vialDetails,
                                    totalCount: productCount,
                                    lots: depot.lots,
                                    discrepancy: disc
                                  }
                                });
                                setShowModal(true);
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* Show site data */}
                {(processedData.inventory?.sites || []).map((site, idx) => {
                  const productCount = selectedProduct === 'ACE2016' ? site.ACE2016 : site.ACE1831;
                  if (productCount === 0) return null;
                  const isExpanded = expandedRows[`site-${idx}`];

                  return (
                    <React.Fragment key={`site-${idx}`}>
                      <tr
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedRows(prev => ({
                          ...prev,
                          [`site-${idx}`]: !prev[`site-${idx}`]
                        }))}
                      >
                        <td className="p-2 font-medium">{site.name}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Site</span>
                        </td>
                        <td className="p-2 text-center font-semibold text-green-600">{productCount}</td>
                        {dataSource === 'excel' && (
                          <>
                            <td className="p-2 text-center text-gray-400">-</td>
                            <td className="p-2 text-center text-gray-400">-</td>
                          </>
                        )}
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            site.status === 'Critical' ? 'bg-red-100 text-red-700' :
                            site.status === 'Low' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {site.status}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <ChevronDown className={`w-4 h-4 inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50 p-3">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold">Vials at {site.name}:</p>
                              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                {(site.vialDetails?.[selectedProduct] || []).map((vial, vIdx) => (
                                  <div
                                    key={vIdx}
                                    className="text-xs p-1 bg-white rounded border cursor-pointer hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVialSearch(vial.vialId);
                                      searchVial();
                                    }}
                                  >
                                    <span className="font-mono text-blue-600">{vial.vialId}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Information note */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-gray-700">
              Click on any row to see vial details. Click on vial IDs to track their journey.
            </p>
          </div>
        </div>

        {/* Recent Vial Movements */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center">
            <Eye className="w-4 h-4 mr-2 text-indigo-600" />
            Recent Vial Movements
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Vial ID</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Current Location</th>
                  <th className="text-left p-2">Patient ID</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(excelData?.vialJourneys?.values() || [])
                  .filter(j => j.product === selectedProduct)
                  .slice(0, 5)
                  .map(journey => (
                  <tr key={journey.vialId} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-blue-600 cursor-pointer hover:underline"
                        onClick={() => {
                          setModalContent({
                            title: `Vial ${journey.vialId} - Complete Journey`,
                            type: 'vialJourney',
                            data: journey
                          });
                          setShowModal(true);
                        }}>
                      {journey.vialId}
                    </td>
                    <td className="p-2">{journey.product}</td>
                    <td className="p-2">{journey.movements[journey.movements.length - 1]?.to || 'Unknown'}</td>
                    <td className="p-2">
                      {journey.patient ? (
                        <span className="text-purple-600 font-semibold">{journey.patient}</span>
                      ) : (
                        <span className="text-gray-400">Available</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        journey.status === 'Administered' ? 'bg-green-100 text-green-700' :
                        journey.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {journey.status}
                      </span>
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => {
                          setModalContent({
                            title: `Vial ${journey.vialId} - Complete Journey`,
                            type: 'vialJourney',
                            data: journey
                          });
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Journey
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ENHANCED MODALS */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg p-6 max-w-5xl max-h-[90vh] overflow-auto w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg flex items-center">
                {modalContent.type === 'locationInventory' && <MapPin className="w-5 h-5 mr-2 text-blue-600" />}
                {modalContent.type === 'monthlyShipments' && <Calendar className="w-5 h-5 mr-2 text-green-600" />}
                {modalContent.type === 'transferDetails' && <Truck className="w-5 h-5 mr-2 text-purple-600" />}
                {modalContent.type === 'vialJourney' && <Activity className="w-5 h-5 mr-2 text-indigo-600" />}
                {modalContent.title}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Location Inventory Details Modal */}
            {modalContent.type === 'locationInventory' && modalContent.data && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Total Vials</p>
                    <p className="text-2xl font-bold text-blue-600">{modalContent.data.totalCount}</p>
                  </div>
                  {modalContent.data.discrepancy && (
                    <>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">Inventory Tab Shows</p>
                        <p className="text-2xl font-bold text-orange-600">{modalContent.data.discrepancy.reported}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        modalContent.data.discrepancy.difference > 0 ? 'bg-red-50' : 'bg-green-50'
                      }`}>
                        <p className="text-xs text-gray-600">Discrepancy</p>
                        <p className={`text-2xl font-bold ${
                          modalContent.data.discrepancy.difference > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {modalContent.data.discrepancy.difference > 0 ? '+' : ''}{modalContent.data.discrepancy.difference}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">All Vials at {modalContent.data.location}</h4>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Vial ID</th>
                          <th className="text-left p-2">Box ID</th>
                          <th className="text-left p-2">From Location</th>
                          <th className="text-left p-2">Last Movement</th>
                          <th className="text-left p-2">Tracking #</th>
                          <th className="text-center p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(modalContent.data.vials || []).map((vial, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-blue-600">{vial.vialId}</td>
                            <td className="p-2">{vial.boxId || '-'}</td>
                            <td className="p-2">{vial.from || '-'}</td>
                            <td className="p-2">{vial.lastMovement ? new Date(vial.lastMovement).toLocaleDateString() : '-'}</td>
                            <td className="p-2 text-xs">{vial.tracking || '-'}</td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  const journey = excelData?.vialJourneys?.get(vial.vialId);
                                  if (journey) {
                                    setModalContent({
                                      title: `Vial ${vial.vialId} - Complete Journey`,
                                      type: 'vialJourney',
                                      data: journey
                                    });
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export Inventory
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Monthly Shipments Modal */}
            {modalContent.type === 'monthlyShipments' && modalContent.data && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Total Shipments</p>
                    <p className="text-2xl font-bold text-blue-600">{modalContent.data.totalShipments}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">ACE2016</p>
                    <p className="text-2xl font-bold text-green-600">{modalContent.data.ACE2016}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">ACE1831</p>
                    <p className="text-2xl font-bold text-purple-600">{modalContent.data.ACE1831}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Returns</p>
                    <p className="text-2xl font-bold text-red-600">{modalContent.data.returns}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Shipment Details for {modalContent.data.month}</h4>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Vial ID</th>
                          <th className="text-left p-2">Product</th>
                          <th className="text-left p-2">From</th>
                          <th className="text-left p-2">To</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Tracking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(modalContent.data.vials || []).map((vial, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-blue-600">{vial.vialId}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                vial.product === 'ACE2016' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {vial.product}
                              </span>
                            </td>
                            <td className="p-2">{vial.from}</td>
                            <td className="p-2">{vial.to}</td>
                            <td className="p-2">{new Date(vial.date).toLocaleDateString()}</td>
                            <td className="p-2 text-xs">{vial.tracking}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Details Modal */}
            {modalContent.type === 'transferDetails' && modalContent.data && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Total Transfers</p>
                    <p className="text-2xl font-bold text-blue-600">{modalContent.data.total}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">ACE2016</p>
                    <p className="text-2xl font-bold text-green-600">{modalContent.data.ACE2016}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">ACE1831</p>
                    <p className="text-2xl font-bold text-purple-600">{modalContent.data.ACE1831}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Percentage</p>
                    <p className="text-2xl font-bold text-indigo-600">{modalContent.data.percentage}%</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">{modalContent.data.type} Transfer Details</h4>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Vial ID</th>
                          <th className="text-left p-2">Product</th>
                          <th className="text-left p-2">From</th>
                          <th className="text-left p-2">To</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(modalContent.data.vials || []).map((vial, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-blue-600">{vial.vialId}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                vial.product === 'ACE2016' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {vial.product}
                              </span>
                            </td>
                            <td className="p-2">{vial.from}</td>
                            <td className="p-2">{vial.to}</td>
                            <td className="p-2">{vial.date ? new Date(vial.date).toLocaleDateString() : '-'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                vial.status === 'Administered' ? 'bg-green-100 text-green-700' :
                                vial.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {vial.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Vial Journey Modal */}
            {modalContent.type === 'vialJourney' && modalContent.data && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Vial ID</p>
                      <p className="font-mono font-semibold text-blue-600">{modalContent.data.vialId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Product</p>
                      <p className="font-semibold">{modalContent.data.product}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Patient</p>
                      <p className="font-semibold text-purple-600">
                        {modalContent.data.patient || 'Not Assigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        modalContent.data.status === 'Administered' ? 'bg-green-100 text-green-700' :
                        modalContent.data.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {modalContent.data.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-3">Complete Journey Timeline</h4>
                  <div className="relative">
                    {modalContent.data.movements.map((move, idx) => (
                      <div key={idx} className="flex items-start mb-4">
                        <div className="flex flex-col items-center mr-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            idx === 0 ? 'bg-blue-600' :
                            idx === modalContent.data.movements.length - 1 ? 'bg-green-600' :
                            'bg-gray-400'
                          }`}>
                            <span className="text-white text-xs font-bold">{idx + 1}</span>
                          </div>
                          {idx < modalContent.data.movements.length - 1 && (
                            <div className="w-0.5 h-16 bg-gray-300 mt-2" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="bg-white border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-sm">
                                  {move.from} → {move.to}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {new Date(move.date).toLocaleDateString()} • {move.type}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">MTF: {move.mtf}</p>
                                <p className="text-xs text-gray-500">Track: {move.tracking}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {modalContent.data.patient && (
                      <div className="flex items-start">
                        <div className="flex flex-col items-center mr-4">
                          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <p className="font-semibold text-sm text-purple-800">
                              Administered to Patient {modalContent.data.patient}
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                              {modalContent.data.treatmentDate ?
                                new Date(modalContent.data.treatmentDate).toLocaleDateString() :
                                'Date pending'}
                              {modalContent.data.treatmentSite && ` • ${modalContent.data.treatmentSite}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Export Journey
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IPInventoryDashboard;
