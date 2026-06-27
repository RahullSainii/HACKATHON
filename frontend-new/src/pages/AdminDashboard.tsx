import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Download, Eye, RefreshCw, Trophy, MapPin, BadgeCheck, Clock3 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useToast, ToastProvider } from '../context/ToastContext';
import ToastManager from '../context/ToastManager';
import api from '../services/api';
import type { Complaint, Stats } from '../types';

const rawOrigin = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_ORIGIN = rawOrigin.replace(/\/api\/?$/, '') || window.location.origin;

const getModerationDisplay = (complaint: Complaint) => {
  const moderation = complaint.moderation;

  if (!moderation) {
    return { label: 'Not Scored', color: 'default' as const };
  }

  if (moderation.status === 'blocked') {
    return { label: 'Blocked', color: 'error' as const };
  }

  if (moderation.status === 'flagged') {
    if (moderation.duplicateScore >= 70) {
      return { label: 'Possible Duplicate', color: 'warning' as const };
    }

    if (moderation.abusiveScore >= 25) {
      return { label: 'Flagged Abuse', color: 'error' as const };
    }

    return { label: 'Flagged Spam', color: 'warning' as const };
  }

  return { label: 'Clean', color: 'success' as const };
};

const AdminDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [handlerDraft, setHandlerDraft] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [complaintsRes, statsRes] = await Promise.all([
        api.get('/complaints'),
        api.get('/stats/all'),
      ]);
      setComplaints(complaintsRes.data.data);
      setStats(statsRes.data.data);
      addToast('Data refreshed successfully!', 'success');
    } catch (err) {
      console.error('Failed to fetch admin data', err);
      addToast('Failed to fetch data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const socket = io(API_ORIGIN, { transports: ['websocket', 'polling'] });
    socket.on('complaint_created', fetchData);
    socket.on('complaint_updated', fetchData);
    socket.on('verification_added', fetchData);
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/complaints/${id}/status`, { status: newStatus });
      fetchData();
      addToast(`Status updated to ${newStatus}.`, 'success');
    } catch (err) {
      console.error('Failed to update status', err);
      addToast('Failed to update status. Please try again.', 'error');
    }
  };

  const openDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const response = await api.get(`/complaints/${id}`);
      setSelectedComplaint(response.data.data);
      setHandlerDraft(response.data.data.handledBy || '');
    } catch (err) {
      console.error('Failed to load complaint details', err);
      addToast('Failed to load details.', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedComplaint(null);
    setHandlerDraft('');
  };

  const saveHandler = async () => {
    if (!selectedComplaint) return;
    try {
      await api.patch(`/complaints/${selectedComplaint._id}/status`, { handledBy: handlerDraft });
      addToast('Handler updated successfully!', 'success');
      fetchData();
      setSelectedComplaint({
        ...selectedComplaint,
        handledBy: handlerDraft,
      });
    } catch (err) {
      console.error('Failed to update handler', err);
      addToast('Failed to update handler.', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `complaints_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('CSV export completed successfully!', 'success');
    } catch (err) {
      console.error('Export failed', err);
      addToast('Failed to export data. Please try again.', 'error');
    }
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const chartData =
    stats?.categoryDistribution.labels.map((label, index) => ({
      name: label,
      value: stats.categoryDistribution.data[index],
    })) || [];

  const COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 4,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 0 10px rgba(0,0,0,0.05)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Oversee and manage all system complaints
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            startIcon={<RefreshCw size={18} />}
            variant="outlined"
            onClick={fetchData}
            sx={{ backgroundColor: 'primary.main', color: 'white' }}
          >
            Refresh Data
          </Button>
          <IconButton
            aria-label="export"
            onClick={handleExport}
            sx={{ mr: 1, bgcolor: 'primary.main', color: 'white' }}
          >
            <Download size={20} />
          </IconButton>
        </Stack>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{
          mb: 4,
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 0 10px rgba(0,0,0,0.05)',
        }}
      >
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom>
                Total Complaints
              </Typography>
              <Chip label={stats?.total ? `${stats.total}` : '0'} variant="outlined" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="warning.main" gutterBottom>
                Pending Complaints
              </Typography>
              <Chip label={stats?.pending ? `${stats.pending}` : '0'} variant="outlined" color="warning" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="success.main" gutterBottom>
                Resolved Complaints
              </Typography>
              <Chip label={stats?.resolved ? `${stats.resolved}` : '0'} variant="outlined" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="success.main" gutterBottom>
                Resolved This Month
              </Typography>
              <Chip icon={<Clock3 size={16} />} label={`${stats?.resolvedThisMonth || 0}`} color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="info.main" gutterBottom>
                Verified Issues
              </Typography>
              <Chip icon={<BadgeCheck size={16} />} label={`${stats?.verifiedIssues || 0}`} color="info" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom>
                Impact Score
              </Typography>
              <Chip icon={<Trophy size={16} />} label={`${stats?.communityImpactScore || 0}`} color="primary" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid
        container
        spacing={4}
        sx={{
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 0 10px rgba(0,0,0,0.05)',
        }}
      >
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, height: 380, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Category Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <ChartTooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: 340, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Response Time Trend
            </Typography>
            <ResponsiveContainer width="100%" height="88%">
              <LineChart data={stats?.responseTimeTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis allowDecimals />
                <ChartTooltip />
                <Line type="monotone" dataKey="avgHours" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, minHeight: 340, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Active Zones
            </Typography>
            <Stack spacing={1.5}>
              {(stats?.activeZones || []).map((zone) => (
                <Box key={zone.location} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      <MapPin size={14} /> {zone.location}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {zone.open} open cases
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${zone.count} total`} />
                </Box>
              ))}
              {(!stats?.activeZones || stats.activeZones.length === 0) && (
                <Typography color="text.secondary">No location data yet.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Citizen Leaderboard
            </Typography>
            <Grid container spacing={2}>
              {(stats?.leaderboard || []).slice(0, 6).map((user) => (
                <Grid size={{ xs: 12, md: 4 }} key={user.email}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Chip label={`#${user.rank}`} color={user.rank <= 3 ? 'primary' : 'default'} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{user.points} points</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                        {(user.badges || []).slice(0, 2).map((badge) => (
                          <Chip key={badge} size="small" label={badge} variant="outlined" />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: '0 3px 5px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Recent Complaints
            </Typography>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>AI Review</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Handler</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Anonymous</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complaints.map((complaint) => {
                    const moderationDisplay = getModerationDisplay(complaint);

                    return (
                      <TableRow key={complaint._id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{complaint.id}</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {complaint.category}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <Typography variant="body2">{complaint.location || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                complaint.priority === 'High'
                                  ? 'error.main'
                                  : complaint.priority === 'Medium'
                                    ? 'warning.main'
                                    : 'text.secondary',
                              fontWeight: 700,
                            }}
                          >
                            {complaint.priority}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Select
                            size="small"
                            value={complaint.status}
                            onChange={(e) => handleStatusChange(complaint._id, e.target.value)}
                            sx={{
                              minWidth: 130,
                              fontSize: '0.875rem',
                              '& .MuiSelect-select': { py: 0.8 },
                            }}
                          >
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Resolved">Resolved</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Chip size="small" label={moderationDisplay.label} color={moderationDisplay.color} variant={moderationDisplay.color === 'default' ? 'outlined' : 'filled'} />
                        </TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            {complaint.handledBy || 'Unassigned'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={complaint.isAnonymous ? 'Yes' : 'No'}
                            color={complaint.isAnonymous ? 'warning' : 'success'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton size="small" onClick={() => openDetails(complaint._id)}>
                            <Eye size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={Boolean(selectedComplaint)} onClose={closeDetails} maxWidth="md" fullWidth>
        <DialogTitle>Complaint Details</DialogTitle>
        <DialogContent dividers>
          {detailsLoading || !selectedComplaint ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={selectedComplaint.id} variant="outlined" />
                <Chip label={selectedComplaint.category} />
                <Chip label={selectedComplaint.priority} color="info" />
                <Chip label={selectedComplaint.status} color="success" />
                <Chip label={getModerationDisplay(selectedComplaint).label} color={getModerationDisplay(selectedComplaint).color} />
                <Chip
                  label={selectedComplaint.isAnonymous ? 'Anonymous' : 'Identified'}
                  color={selectedComplaint.isAnonymous ? 'warning' : 'success'}
                  variant="outlined"
                />
              </Box>

              <Typography variant="subtitle2">AI Review</Typography>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                <Stack spacing={1.5}>
                  <Typography variant="body2">
                    Suggested Category:{' '}
                    <strong>
                      {selectedComplaint.aiCategorySuggestion?.category || 'No suggestion'}
                      {selectedComplaint.aiCategorySuggestion?.confidence
                        ? ` (${selectedComplaint.aiCategorySuggestion.confidence}%)`
                        : ''}
                    </strong>
                  </Typography>
                  <Typography variant="body2">
                    Status: <strong>{getModerationDisplay(selectedComplaint).label}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Spam Score: <strong>{selectedComplaint.moderation?.spamScore ?? 0}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Abuse Score: <strong>{selectedComplaint.moderation?.abusiveScore ?? 0}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Duplicate Score: <strong>{selectedComplaint.moderation?.duplicateScore ?? 0}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Reasons:{' '}
                    <strong>
                      {selectedComplaint.moderation?.reasons?.length
                        ? selectedComplaint.moderation.reasons.join(', ')
                        : 'No issues detected'}
                    </strong>
                  </Typography>
                </Stack>
              </Paper>

              <Typography variant="subtitle2">Location</Typography>
              <Typography>{selectedComplaint.location || '-'}</Typography>

              <Typography variant="subtitle2">Description</Typography>
              <Typography>{selectedComplaint.description}</Typography>

              <Typography variant="subtitle2">Reported By</Typography>
              <Typography>
                {selectedComplaint.isAnonymous ? 'Anonymous' : selectedComplaint.reportedBy || 'User'}
              </Typography>

              <Typography variant="subtitle2">Community Verification</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  icon={<BadgeCheck size={16} />}
                  label={`${selectedComplaint.verificationCount || 0} confirmations`}
                  color={selectedComplaint.verifiedAt ? 'success' : 'default'}
                />
                {selectedComplaint.verifiedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Verified on {new Date(selectedComplaint.verifiedAt).toLocaleString()}
                  </Typography>
                )}
              </Stack>

              <TextField
                label="Handled By"
                value={handlerDraft}
                onChange={(e) => setHandlerDraft(e.target.value)}
                placeholder="Enter staff/handler name"
                fullWidth
              />

              <Typography variant="subtitle2">Attachments</Typography>
              {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 1.5,
                  }}
                >
                  {selectedComplaint.attachments.map((att, index) => (
                    <Box
                      key={`${att.name}-${index}`}
                      component="img"
                      src={att.data}
                      alt={att.name}
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 2,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">No attachments</Typography>
              )}

              {((selectedComplaint.imageUrls?.length || 0) > 0 || (selectedComplaint.videoUrls?.length || 0) > 0) && (
                <>
                  <Typography variant="subtitle2">Uploaded Media</Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 1.5,
                    }}
                  >
                    {(selectedComplaint.imageUrls || []).map((url) => (
                      <Box
                        key={url}
                        component="img"
                        src={url.startsWith('/uploads') ? `${API_ORIGIN}${url}` : url}
                        alt="Uploaded complaint"
                        sx={{
                          width: '100%',
                          height: 130,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid rgba(15, 23, 42, 0.12)',
                        }}
                      />
                    ))}
                    {(selectedComplaint.videoUrls || []).map((url) => (
                      <Box
                        key={url}
                        component="video"
                        src={url.startsWith('/uploads') ? `${API_ORIGIN}${url}` : url}
                        controls
                        sx={{
                          width: '100%',
                          height: 130,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid rgba(15, 23, 42, 0.12)',
                        }}
                      />
                    ))}
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails} variant="outlined">
            Close
          </Button>
          <Button onClick={saveHandler} variant="contained">
            Save Handler
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default function AdminDashboardWrapper() {
  return (
    <ToastProvider>
      <AdminDashboard />
      <ToastManager />
    </ToastProvider>
  );
}
