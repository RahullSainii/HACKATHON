import React, { useEffect, useRef, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  InputAdornment,
  Tooltip,
  Stack,
  FormControlLabel,
  Switch,
  ListSubheader,
  Card,
  CardContent,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Search, PlusCircle, RefreshCw, Camera, Upload, X, MapPin, Navigation, BadgeCheck, Sparkles } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import type { Complaint } from '../types';

const rawOrigin = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_ORIGIN = rawOrigin.replace(/\/api\/?$/, '') || window.location.origin;

const UserDashboard: React.FC = () => {
  const categoryGroups = [
    {
      label: 'Technical',
      options: [
        { value: 'Technical - LMS Issue', label: 'LMS Issue' },
        { value: 'Technical - WebKiosk Down', label: 'WebKiosk Down' },
        { value: 'Technical - E-Ticket Issue', label: 'E-Ticket Issue' },
        { value: 'Technical - Email Access', label: 'Email Access' },
        { value: 'Technical - Wi-Fi/Network', label: 'Wi-Fi / Network' },
        { value: 'Technical - Portal Login Issue', label: 'Portal Login Issue' },
        { value: 'Technical - Software Installation', label: 'Software Installation' },
        { value: 'Technical - Hardware Fault', label: 'Hardware Fault' },
        { value: 'Technical - Lab System Issue', label: 'Lab System Issue' },
        { value: 'Technical - Other', label: 'Other (Technical)' },
      ],
    },
    {
      label: 'Billing',
      options: [
        { value: 'Billing - Fee Payment', label: 'Fee Payment' },
        { value: 'Billing - Receipt Correction', label: 'Receipt Correction' },
        { value: 'Billing - Scholarship/Refund', label: 'Scholarship / Refund' },
        { value: 'Billing - Hostel Fee', label: 'Hostel Fee' },
        { value: 'Billing - Library Fine', label: 'Library Fine' },
        { value: 'Billing - Other', label: 'Other (Billing)' },
      ],
    },
    {
      label: 'Service',
      options: [
        { value: 'Service - Mess/Cafeteria', label: 'Mess / Cafeteria' },
        { value: 'Service - Housekeeping', label: 'Housekeeping' },
        { value: 'Service - Transport/Bus', label: 'Transport / Bus' },
        { value: 'Service - Security', label: 'Security' },
        { value: 'Service - Medical', label: 'Medical' },
        { value: 'Service - Other', label: 'Other (Service)' },
      ],
    },
    {
      label: 'Infrastructure',
      options: [
        { value: 'Infrastructure - Classroom', label: 'Classroom' },
        { value: 'Infrastructure - Lab', label: 'Lab' },
        { value: 'Infrastructure - Washroom', label: 'Washroom' },
        { value: 'Infrastructure - Hostel Room', label: 'Hostel Room' },
        { value: 'Infrastructure - Power/Electricity', label: 'Power / Electricity' },
        { value: 'Infrastructure - Water Supply', label: 'Water Supply' },
        { value: 'Infrastructure - Parking', label: 'Parking' },
        { value: 'Infrastructure - Other', label: 'Other (Infrastructure)' },
      ],
    },
    {
      label: 'Other',
      options: [
        { value: 'Other - Suggestion', label: 'Suggestion' },
        { value: 'Other - General Query', label: 'General Query' },
      ],
    },
  ];
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsSupported, setGpsSupported] = useState(true);
  const [nearbyComplaints, setNearbyComplaints] = useState<Complaint[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<Complaint['aiCategorySuggestion'] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const MAX_ATTACHMENTS = 3;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 30 * 1024 * 1024;

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await api.get('/complaints/my');
      setComplaints(response.data.data);
    } catch (err) {
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    const socket = io(API_ORIGIN, { transports: ['websocket', 'polling'] });
    socket.on('complaint_created', fetchComplaints);
    socket.on('complaint_updated', fetchComplaints);
    socket.on('verification_added', fetchComplaints);
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setGpsSupported(Boolean(navigator.geolocation));
  }, []);

  useEffect(() => {
    setCameraSupported(Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      if (!cameraOpen) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraSupported(false);
        setCameraError('Camera is not supported on this device/browser.');
        setCameraOpen(false);
        return;
      }

      setCameraError('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError('Unable to access camera. Please allow camera permissions.');
        setCameraOpen(false);
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!location.trim()) {
        setError('Please provide the exact campus location.');
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('description', description);
      formData.append('location', location.trim());
      formData.append('isAnonymous', String(isAnonymous));
      if (gpsCoords) {
        formData.append('latitude', String(gpsCoords.lat));
        formData.append('longitude', String(gpsCoords.lon));
      }
      attachments.forEach((file) => formData.append('files', file));

      await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        },
      });
      setSuccess('Complaint submitted successfully!');
      setCategory('');
      setPriority('Medium');
      setDescription('');
      setLocation('');
      setGpsCoords(null);
      setNearbyComplaints([]);
      setAiSuggestion(null);
      setIsAnonymous(false);
      attachmentPreviews.forEach((url) => URL.revokeObjectURL(url));
      setAttachments([]);
      setAttachmentPreviews([]);
      setAttachmentError('');
      fetchComplaints();
    } catch (err: any) {
      const apiError = err.response?.data;
      if (apiError?.errors?.length) {
        setError(apiError.errors.map((item: { msg: string }) => item.msg).join(', '));
      } else {
        setError(apiError?.message || 'Failed to submit complaint');
      }
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'In Progress': return 'info';
      case 'Resolved': return 'success';
      default: return 'default';
    }
  };

  const filteredComplaints = complaints.filter(c => 
    (
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      (c.location || '').toLowerCase().includes(search.toLowerCase())
    ) &&
    (statusFilter === '' || c.status === statusFilter)
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    addAttachments(Array.from(files));
  };

  const handleUseGps = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsSupported(false);
      setGpsError('GPS is not supported on this device/browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setGpsCoords({ lat, lon });
        setLocation(`GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        setGpsLoading(false);
        api.get('/complaints/nearby', { params: { lat, lng: lon, radiusKm: 2 } })
          .then((response) => setNearbyComplaints(response.data.data || []))
          .catch(() => setNearbyComplaints([]));
      },
      (err) => {
        setGpsError(err.message || 'Unable to access GPS location.');
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const analyzeCategory = async () => {
    if (!description.trim() || description.trim().length < 10) {
      setAttachmentError('Add a clearer description before asking AI to suggest a category.');
      return;
    }

    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const imagePayload = await Promise.all(
        attachments
          .filter((file) => file.type.startsWith('image/'))
          .slice(0, 2)
          .map(async (file) => {
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(file);
            });

            return {
              name: file.name,
              type: file.type,
              size: file.size,
              data,
            };
          })
      );

      const response = await api.post('/complaints/ai-category', {
        description,
        attachments: imagePayload,
      });
      const suggestion = response.data.data;
      setAiSuggestion(suggestion);
      if (suggestion.category && suggestion.confidence >= 60) {
        setCategory(suggestion.category);
      }
    } catch (err: any) {
      setAttachmentError(err.response?.data?.message || 'AI category analysis failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const addAttachments = (files: File[]) => {
    setAttachmentError('');

    const nextFiles = [...attachments];
    const nextPreviews = [...attachmentPreviews];

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        setAttachmentError('Only image and video files are allowed.');
        continue;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        setAttachmentError('Each image must be under 5MB.');
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        setAttachmentError('Each video must be under 30MB.');
        continue;
      }
      if (nextFiles.length >= MAX_ATTACHMENTS) {
        setAttachmentError(`Maximum ${MAX_ATTACHMENTS} images allowed.`);
        break;
      }

      nextFiles.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }

    setAttachments(nextFiles);
    setAttachmentPreviews(nextPreviews);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    if (attachments.length >= MAX_ATTACHMENTS) {
      setAttachmentError(`Maximum ${MAX_ATTACHMENTS} images allowed.`);
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const blob = await fetch(dataUrl).then(res => res.blob());
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type });

    addAttachments([file]);
  };

  const removeAttachment = (index: number) => {
    const preview = attachmentPreviews[index];
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const verifyComplaint = async (id: string) => {
    try {
      await api.post(`/complaints/${id}/verify`);
      setSuccess('Thanks for confirming this issue.');
      fetchComplaints();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to verify this complaint.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        User Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Submit new complaints and track their resolution status.
      </Typography>

      <Grid container spacing={4}>
        {/* Submission Form */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlusCircle size={20} /> Submit New Complaint
            </Typography>
            
            {success && <Alert data-testid="complaint-success" severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert data-testid="complaint-error" severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <form onSubmit={handleSubmit} data-testid="complaint-form">
              <TextField
                fullWidth
                select
                label="Category"
                id="complaint-category"
                SelectProps={{ inputProps: { 'data-testid': 'complaint-category' } }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                margin="normal"
                required
              >
                {categoryGroups.map((group) => (
                  [
                    <ListSubheader key={`${group.label}-header`}>{group.label}</ListSubheader>,
                    ...group.options.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    )),
                  ]
                ))}
              </TextField>

              <TextField
                fullWidth
                select
                label="Priority"
                id="complaint-priority"
                SelectProps={{ inputProps: { 'data-testid': 'complaint-priority' } }}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                margin="normal"
                required
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Exact Location"
                id="complaint-location"
                inputProps={{ 'data-testid': 'complaint-location', list: 'location-options' }}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                margin="normal"
                required
                placeholder="Hostel room, lab number, block..."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<MapPin size={16} />}
                  onClick={handleUseGps}
                  disabled={!gpsSupported || gpsLoading}
                >
                  {gpsLoading ? 'Locating…' : 'Use GPS Location'}
                </Button>
                {gpsCoords && (
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<Navigation size={16} />}
                    component="a"
                    href={`https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lon}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Maps
                  </Button>
                )}
              </Stack>
              {!gpsSupported && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  GPS is not supported on this device/browser.
                </Alert>
              )}
              {gpsError && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {gpsError}
                </Alert>
              )}
              <datalist id="location-options">
                <option value="Hostel Block A - Room 203" />
                <option value="Hostel Block C - Room 412" />
                <option value="Library - Ground Floor" />
                <option value="Computer Lab - Block B" />
                <option value="Admin Block - Helpdesk" />
              </datalist>

              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                id="complaint-description"
                inputProps={{ 'data-testid': 'complaint-description' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                margin="normal"
                required
                placeholder="Describe your issue in detail (min 10 characters)"
              />

              <Card variant="outlined" sx={{ mt: 2, bgcolor: 'rgba(14, 165, 233, 0.04)' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Sparkles size={16} /> AI Auto-Categorization
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Uses GPT Vision when configured, otherwise falls back to local keyword analysis.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={analyzeCategory}
                      disabled={aiLoading}
                    >
                      {aiLoading ? 'Analyzing...' : 'Suggest'}
                    </Button>
                  </Stack>
                  {aiSuggestion && (
                    <Alert severity={aiSuggestion.confidence >= 60 ? 'success' : 'info'} sx={{ mt: 1.5 }}>
                      {aiSuggestion.category || 'No confident match'} ({aiSuggestion.confidence}%): {aiSuggestion.reason}
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                }
                label="Submit anonymously (your identity will be hidden from staff)"
              />

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  border: '1px dashed rgba(15, 23, 42, 0.2)',
                  backgroundColor: 'background.default',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Attach Photos
                  </Typography>
                  <Chip
                    label={`${attachments.length}/${MAX_ATTACHMENTS}`}
                    size="small"
                    sx={{ bgcolor: 'rgba(14, 165, 233, 0.15)', fontWeight: 600 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Capture from camera or upload images/videos (max 3 files, 5MB images, 30MB videos).
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Camera size={16} />}
                    onClick={() => {
                      if (!cameraSupported) {
                        setCameraError('Camera is not supported on this device/browser.');
                        return;
                      }
                      setCameraOpen(true);
                    }}
                    disabled={!cameraSupported}
                  >
                    Capture
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Upload size={16} />}
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    Upload
                  </Button>
                </Stack>

                {attachmentError && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {attachmentError}
                  </Alert>
                )}

                {cameraError && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {cameraError}
                  </Alert>
                )}

                {cameraOpen && (
                  <Box
                    sx={{
                      mt: 2,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid rgba(15, 23, 42, 0.15)',
                      backgroundColor: '#0b1020',
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: 260, objectFit: 'cover' }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: 'rgba(0,0,0,0.55)',
                          color: 'white',
                          fontSize: 12,
                        }}
                      >
                        Live Camera
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={2} sx={{ p: 2 }}>
                      <Button variant="contained" size="small" onClick={capturePhoto}>
                        Capture Photo
                      </Button>
                      <Button variant="outlined" size="small" onClick={stopCamera}>
                        Close Camera
                      </Button>
                    </Stack>
                  </Box>
                )}

                {attachmentPreviews.length > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                      gap: 1,
                    }}
                  >
                    {attachmentPreviews.map((preview, index) => (
                      <Box key={preview} sx={{ position: 'relative' }}>
                        {attachments[index]?.type.startsWith('video/') ? (
                          <Box
                            component="video"
                            src={preview}
                            muted
                            sx={{
                              width: '100%',
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 1.5,
                              border: '1px solid rgba(15, 23, 42, 0.12)',
                            }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={preview}
                            alt={`attachment-${index + 1}`}
                            sx={{
                              width: '100%',
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 1.5,
                              border: '1px solid rgba(15, 23, 42, 0.12)',
                            }}
                          />
                        )}
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            onClick={() => removeAttachment(index)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(15, 23, 42, 0.7)',
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.85)' },
                            }}
                          >
                            <X size={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                data-testid="complaint-submit"
                disabled={submitting}
                sx={{ mt: 2 }}
              >
                {submitting ? <CircularProgress size={24} /> : 'Submit Complaint'}
              </Button>
              {submitting && uploadProgress > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary">
                    Uploading evidence: {uploadProgress}%
                  </Typography>
                </Box>
              )}
            </form>
          </Paper>

          {nearbyComplaints.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Nearby Complaints
              </Typography>
              <Stack spacing={1.5}>
                {nearbyComplaints.slice(0, 4).map((item) => (
                  <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{item.category}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.location}</Typography>
                    </Box>
                    <Chip size="small" label={item.status} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>

        {/* Complaints List */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                My Complaints
              </Typography>
              <IconButton onClick={fetchComplaints} size="small">
                <RefreshCw size={18} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="Search complaints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                size="small"
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
              </TextField>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Handled By</TableCell>
                    <TableCell>Attachments</TableCell>
                    <TableCell>Verifications</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : filteredComplaints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        No complaints found.
                      </TableCell>
                    </TableRow>
                  ) : filteredComplaints.map((complaint) => (
                    <TableRow key={complaint._id}>
                      <TableCell sx={{ fontWeight: 600 }}>{complaint.id}</TableCell>
                      <TableCell>{complaint.category}</TableCell>
                      <TableCell>{complaint.location || '—'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={complaint.status} 
                          color={getStatusColor(complaint.status) as any} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{complaint.handledBy || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Chip
                          label={complaint.attachmentCount ? `${complaint.attachmentCount} files` : '—'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            icon={<BadgeCheck size={14} />}
                            label={complaint.verificationCount || 0}
                            size="small"
                            color={complaint.verifiedAt ? 'success' : 'default'}
                            variant={complaint.verifiedAt ? 'filled' : 'outlined'}
                          />
                          <Tooltip title="Confirm this issue">
                            <IconButton size="small" onClick={() => verifyComplaint(complaint._id)}>
                              <BadgeCheck size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>{complaint.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserDashboard;
