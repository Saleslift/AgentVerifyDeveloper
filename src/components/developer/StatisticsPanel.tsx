import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Eye, 
  FileText, 
  RefreshCw, 
  Calendar, 
  PanelBottom,
  Home,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { formatDistanceToNow } from 'date-fns';

interface StatisticsPanelProps {
  developerId: string;
}

interface StatisticsData {
  agencyCount: number;
  activeAgencyCount: number;
  agentCount: number;
  agentsShowcasingCount: number;
  projectCount: number;
  activeProjectCount: number;
  unitCount: number;
  agentPageViews: number;
  buyerPageViews: number;
  propertyViews: number;
  lastUpdated: Date;
  agentGrowthRate: number;
  viewsGrowthRate: number;
}

export default function StatisticsPanel({ developerId }: StatisticsPanelProps) {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, [developerId]);

  const fetchStatistics = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch signed agencies
      const { data: agencyContracts, error: agencyError } = await supabase
        .from('developer_agency_contracts')
        .select('id, agency_id, status')
        .eq('developer_id', developerId);

      if (agencyError) throw agencyError;

      // Get all project IDs for this developer
      const { data: projects, error: projectsError } = await supabase
        .from('properties')
        .select('id, status')
        .eq('creator_type', 'developer')
        .eq('creator_id', developerId);

      if (projectsError) throw projectsError;

      // Extract project IDs
      const projectIds = projects?.map(p => p.id) || [];
      
      // Get agents showcasing developer's projects
      const { data: agentProjects, error: agentProjectsError } = await supabase
        .from('agent_projects')
        .select('id, agent_id, project_id')
        .in('project_id', projectIds);

      if (agentProjectsError) throw agentProjectsError;

      // Count active agencies
      const activeAgencies = agencyContracts?.filter(c => c.status === 'active').length || 0;
      const totalAgencies = agencyContracts?.length || 0;

      // Get all agents from the active agencies
      const activeAgencyIds = agencyContracts
        ?.filter(c => c.status === 'active')
        .map(c => c.agency_id) || [];

      const { data: agencyAgents, error: agencyAgentsError } = await supabase
        .from('agency_agents')
        .select('id, agent_id')
        .in('agency_id', activeAgencyIds)
        .eq('status', 'active');

      if (agencyAgentsError) throw agencyAgentsError;

      // Get units for all projects
      const { data: unitTypes, error: unitTypesError } = await supabase
        .from('unit_types')
        .select('id, project_id, status')
        .in('project_id', projectIds);

      if (unitTypesError) throw unitTypesError;

      // Get page views for all projects with the type of viewer
      const { data: pageViews, error: pageViewsError } = await supabase
        .from('page_views')
        .select('id, property_id, viewer_id, viewed_at')
        .in('property_id', projectIds);
        
      if (pageViewsError) throw pageViewsError;

      // Calculate views from agents vs. general public
      const agentViews = pageViews?.filter(view => view.viewer_id !== null).length || 0;
      const publicViews = pageViews?.filter(view => view.viewer_id === null).length || 0;
      
      // Get views from previous period for growth calculation
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      const currentPeriodViews = pageViews?.filter(view => 
        new Date(view.viewed_at) >= thirtyDaysAgo
      ).length || 0;
      
      const previousPeriodViews = pageViews?.filter(view => 
        new Date(view.viewed_at) >= sixtyDaysAgo && 
        new Date(view.viewed_at) < thirtyDaysAgo
      ).length || 0;

      // Calculate growth rates
      const viewsGrowthRate = previousPeriodViews === 0 
        ? currentPeriodViews * 100 
        : ((currentPeriodViews - previousPeriodViews) / previousPeriodViews) * 100;

      // Count current month vs. previous month agent additions
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const currentMonthAgents = agentProjects?.filter(ap => 
        new Date(ap.created_at) >= currentMonthStart
      ).length || 0;
      
      const previousMonthAgents = agentProjects?.filter(ap => 
        new Date(ap.created_at) >= previousMonthStart && 
        new Date(ap.created_at) < currentMonthStart
      ).length || 0;
      
      const agentGrowthRate = previousMonthAgents === 0 
        ? currentMonthAgents * 100 
        : ((currentMonthAgents - previousMonthAgents) / previousMonthAgents) * 100;

      // Build statistics object
      setStatistics({
        agencyCount: totalAgencies,
        activeAgencyCount: activeAgencies,
        agentCount: agencyAgents?.length || 0,
        agentsShowcasingCount: new Set(agentProjects?.map(ap => ap.agent_id)).size,
        projectCount: projects?.length || 0,
        activeProjectCount: projects?.filter(p => p.status === 'published' || p.status === 'validated').length || 0,
        unitCount: unitTypes?.filter(ut => ut.status === 'available').length || 0,
        agentPageViews: agentViews,
        buyerPageViews: publicViews,
        propertyViews: pageViews?.length || 0,
        lastUpdated: new Date(),
        agentGrowthRate,
        viewsGrowthRate
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to load statistics. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportStatistics = async () => {
    if (!statistics) return;

    try {
      // Create CSV content
      const csvContent = [
        ['Developer Statistics', `Generated on ${new Date().toLocaleString()}`],
        [''],
        ['Metric', 'Value'],
        ['Total Agencies', statistics.agencyCount],
        ['Active Agencies', statistics.activeAgencyCount],
        ['Total Agents', statistics.agentCount],
        ['Agents Showcasing Projects', statistics.agentsShowcasingCount],
        ['Total Projects', statistics.projectCount],
        ['Active Projects', statistics.activeProjectCount],
        ['Total Units for Sale', statistics.unitCount],
        ['Agent Page Views', statistics.agentPageViews],
        ['Buyer Page Views', statistics.buyerPageViews],
        ['Total Property Views', statistics.propertyViews]
      ]
        .map(row => row.join(','))
        .join('\n');

      // Create a downloadable link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `developer_statistics_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting statistics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <div className="flex">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchStatistics}
              className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 inline-flex items-center text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Project Statistics</h2>
          <p className="text-gray-500 mt-1">
            {statistics?.lastUpdated && (
              `Last updated ${formatDistanceToNow(statistics.lastUpdated)} ago`
            )}
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
          <button
            onClick={fetchStatistics}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={exportStatistics}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agency Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Agencies</h3>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{statistics?.activeAgencyCount}</p>
              <p className="text-sm text-gray-500">Active partnerships</p>
            </div>
            <div className="text-gray-500">
              <span className="text-xl">/</span>
              <span className="text-xl ml-1">{statistics?.agencyCount}</span>
              <p className="text-xs">Total</p>
            </div>
          </div>
        </div>

        {/* Agent Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Agents</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{statistics?.agentsShowcasingCount}</p>
              <p className="text-sm text-gray-500">Displaying your projects</p>
            </div>
            {statistics && (
              <div className={`flex items-center text-sm ${
                statistics.agentGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {statistics.agentGrowthRate >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                <span>{Math.abs(statistics.agentGrowthRate).toFixed(0)}%</span>
                <span className="text-xs text-gray-500 ml-1">this month</span>
              </div>
            )}
          </div>
        </div>

        {/* Projects Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Projects</h3>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{statistics?.projectCount}</p>
              <p className="text-sm text-gray-500">Total projects</p>
            </div>
            <div className="text-gray-500">
              <span className="text-xl">{statistics?.activeProjectCount}</span>
              <p className="text-xs">Active</p>
            </div>
          </div>
        </div>

        {/* Units Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Properties</h3>
            <Home className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{statistics?.unitCount}</p>
              <p className="text-sm text-gray-500">Units for sale</p>
            </div>
            <div className="text-xs text-gray-500">
              Across all projects
            </div>
          </div>
        </div>

        {/* Agent Views */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Agent Views</h3>
            <Eye className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{statistics?.agentPageViews}</p>
              <p className="text-sm text-gray-500">From agents</p>
            </div>
            <div className="text-xs text-gray-500">
              Last 30 days
            </div>
          </div>
        </div>

        {/* Buyer Views */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Buyer Views</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{statistics?.buyerPageViews}</p>
              <p className="text-sm text-gray-500">From potential buyers</p>
            </div>
            {statistics && (
              <div className={`flex items-center text-sm ${
                statistics.viewsGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {statistics.viewsGrowthRate >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                <span>{Math.abs(statistics.viewsGrowthRate).toFixed(0)}%</span>
                <span className="text-xs text-gray-500 ml-1">vs last period</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
        
        {/* Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Projects to Agents Ratio */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-gray-500 mb-2">
              <PanelBottom className="h-5 w-5 mr-2" />
              <h4 className="text-sm font-medium">Projects to Agents Ratio</h4>
            </div>
            <p className="text-2xl font-bold">
              {statistics && statistics.agentsShowcasingCount > 0
                ? (statistics.projectCount / statistics.agentsShowcasingCount).toFixed(2)
                : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Projects per agent
            </p>
          </div>

          {/* Most Active Month */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-gray-500 mb-2">
              <Calendar className="h-5 w-5 mr-2" />
              <h4 className="text-sm font-medium">Average Views</h4>
            </div>
            <p className="text-2xl font-bold">
              {statistics && statistics.projectCount > 0
                ? Math.round(statistics.propertyViews / statistics.projectCount)
                : '0'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Per project
            </p>
          </div>

          {/* Agency to Agent Ratio */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-gray-500 mb-2">
              <Users className="h-5 w-5 mr-2" />
              <h4 className="text-sm font-medium">Agents per Agency</h4>
            </div>
            <p className="text-2xl font-bold">
              {statistics && statistics.activeAgencyCount > 0
                ? Math.round(statistics.agentCount / statistics.activeAgencyCount)
                : '0'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Average agents
            </p>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600 mt-6">
        <p>
          These statistics show the performance of your projects across the platform. Use this information to:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Track which agencies and agents are promoting your projects</li>
          <li>Identify trends in buyer interest</li>
          <li>Plan your marketing strategy based on engagement metrics</li>
        </ul>
      </div>
    </div>
  );
}