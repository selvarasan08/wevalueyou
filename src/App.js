import React, { useState, useRef } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Box,
  Paper,
  Chip,
} from '@mui/material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';

import {
  Send,
  CloudUpload,
  Close,
  CheckCircle,
  Warning,
  Build,
  LocationOn,
  Description,
  PriorityHigh,
  ContactPhone,
  Email,
  Person,
  CameraAlt,
} from '@mui/icons-material';
import watermark from './waterMark-removebg-preview.png';
import logo from './logo.png';
import emailjs from '@emailjs/browser';

export default function FacilityIssuesReport() {
  const [formData, setFormData] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    locationDepartment: '',
    issueType: '',
    description: '',
    urgency: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const [submitStatus, setSubmitStatus] = useState(null);
  const fileInputRef = useRef(null);

  // Configure your EmailJS credentials here
  const EMAILJS_SERVICE_ID = 'service_7wjoe3t';
  const EMAILJS_TEMPLATE_ID = 'template_2zf30dq';
  const EMAILJS_PUBLIC_KEY = 'jleqZ6bYmgFzO3XcC';

  const issueTypes = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Furniture',
    'Safety',
    'Cleaning',
    'Security',
    'IT Equipment',
    'Structural',
    'Other',
  ];

  const urgencyLevels = [
    { value: 'Low', color: '#4caf50', icon: '●' },
    { value: 'Medium', color: '#ff9800', icon: '●●' },
    { value: 'High', color: '#f44336', icon: '●●●' },
    { value: 'Emergency', color: '#d32f2f', icon: '🚨' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const compressImage = (base64Image) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Image;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxSize = 600;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL('image/jpeg', 0.5);
        let sizeInKB = (compressed.length * 3) / 4 / 1024;

        console.log(`First compression: ${sizeInKB.toFixed(2)} KB`);

        if (sizeInKB > 35) {
          compressed = canvas.toDataURL('image/jpeg', 0.3);
          sizeInKB = (compressed.length * 3) / 4 / 1024;
          console.log(`Second compression: ${sizeInKB.toFixed(2)} KB`);
        }

        if (sizeInKB > 35) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = width * 0.7;
          smallCanvas.height = height * 0.7;
          const smallCtx = smallCanvas.getContext('2d');
          smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
          compressed = smallCanvas.toDataURL('image/jpeg', 0.3);
          sizeInKB = (compressed.length * 3) / 4 / 1024;
          console.log(`Final compression: ${sizeInKB.toFixed(2)} KB`);
        }

        resolve(compressed);
      };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) {
        setSubmitStatus({
          type: 'error',
          message: 'Image size should be less than 5MB',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setImagePreview(compressed);

        setSubmitStatus({
          type: 'info',
          message: 'Image uploaded and compressed for email delivery',
        });

        setTimeout(() => {
          if (submitStatus?.type === 'info') {
            setSubmitStatus(null);
          }
        }, 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const required = ['locationDepartment', 'issueType', 'description', 'urgency', 'contactName', 'contactEmail'];
    for (let field of required) {
      if (!formData[field]) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill in all required fields',
      });
      return;
    }

    setLoading(true);
    setSubmitStatus(null);




    try {
      const templateParams = {
        report_date: new Date(formData.dateTime).toLocaleString(),
        location_department: formData.locationDepartment,
        issue_type: formData.issueType,
        description: formData.description,
        urgency: formData.urgency,
        contact_name: formData.contactName,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone || 'N/A',
        photo_data: imagePreview || '',
      };

      const jsonSize = new Blob([JSON.stringify(templateParams)]).size / 1024;
      console.log(`Total data size: ${jsonSize.toFixed(2)} KB`);

      if (jsonSize > 48) {
        setSubmitStatus({
          type: 'error',
          message: 'Data is too large. Please try removing the photo and submit again.',
        });
        setLoading(false);
        return;
      }

      console.log('Sending email...');

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log('Email sent successfully:', response);

      if (response.status === 200) {
        setSubmitStatus({
          type: 'success',
          message: 'Report submitted successfully! The facilities team has been notified.',
        });

        if (response.status === 200) {
          setSuccessDialogOpen(true);

          setTimeout(() => {
            setFormData({
              dateTime: new Date().toISOString().slice(0, 16),
              locationDepartment: '',
              issueType: '',
              description: '',
              urgency: '',
              contactName: '',
              contactEmail: '',
              contactPhone: '',
            });
            removeImage();
          }, 500);
        }
        setTimeout(() => {
          setFormData({
            dateTime: new Date().toISOString().slice(0, 16),
            locationDepartment: '',
            issueType: '',
            description: '',
            urgency: '',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
          });
          removeImage();
          setSubmitStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error('EmailJS Error:', error);
      console.error('Error details:', error.text || error.message);

      let errorMessage = 'Failed to submit report. ';
      if (error.text && error.text.includes('size limit')) {
        errorMessage += 'Data is too large. Try submitting without the photo or use a smaller image.';
      } else if (error.text && error.text.includes('template')) {
        errorMessage += 'Email template configuration error. Please check the EMAILJS_FIX_GUIDE.md file.';
      } else {
        errorMessage += error.text || error.message || 'Please try again';
      }

      setSubmitStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyChip = (urgency) => {
    const level = urgencyLevels.find(l => l.value === urgency);
    return level ? (
      <Chip
        label={urgency}
        size="small"
        sx={{
          backgroundColor: level.color + '20',
          color: level.color,
          fontWeight: 600,
          height: 32
        }}
      />
    ) : null;
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      py: { xs: 4, md: 8 },
      px: { xs: 2, sm: 4, md: 6 },
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* EXPANDED Multiple Diagonal Watermarks - 15 watermarks total */}
      <Box sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}>
        {/* Top Left Corner */}
        <Box sx={{
          position: 'absolute',
          top: '-80px',
          left: '-80px',
          width: '350px',
          height: '350px',
          transform: 'rotate(-45deg)',
          opacity: 0.05,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Top Center Left */}
        <Box sx={{
          position: 'absolute',
          top: '50px',
          left: '20%',
          width: '280px',
          height: '280px',
          transform: 'rotate(-38deg)',
          opacity: 0.04,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Top Center */}
        <Box sx={{
          position: 'absolute',
          top: '100px',
          left: '45%',
          width: '300px',
          height: '300px',
          transform: 'rotate(-30deg)',
          opacity: 0.04,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Top Right */}
        <Box sx={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          transform: 'rotate(-45deg)',
          opacity: 0.06,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Top Right Inner */}
        <Box sx={{
          position: 'absolute',
          top: '120px',
          right: '15%',
          width: '290px',
          height: '290px',
          transform: 'rotate(-42deg)',
          opacity: 0.04,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Middle Left Top */}
        <Box sx={{
          position: 'absolute',
          top: '30%',
          left: '-120px',
          width: '380px',
          height: '380px',
          transform: 'rotate(-50deg)',
          opacity: 0.05,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Middle Left Center */}
        <Box sx={{
          position: 'absolute',
          top: '45%',
          left: '10%',
          width: '260px',
          height: '260px',
          transform: 'rotate(-48deg)',
          opacity: 0.035,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Center Large Watermark */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '500px',
          height: '500px',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          opacity: 0.03,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Middle Right Top */}
        <Box sx={{
          position: 'absolute',
          top: '35%',
          right: '-90px',
          width: '360px',
          height: '360px',
          transform: 'rotate(-40deg)',
          opacity: 0.05,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Middle Right Center */}
        <Box sx={{
          position: 'absolute',
          top: '55%',
          right: '12%',
          width: '310px',
          height: '310px',
          transform: 'rotate(-52deg)',
          opacity: 0.045,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Bottom Left Top */}
        <Box sx={{
          position: 'absolute',
          bottom: '250px',
          left: '8%',
          width: '290px',
          height: '290px',
          transform: 'rotate(-48deg)',
          opacity: 0.04,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Bottom Left */}
        <Box sx={{
          position: 'absolute',
          bottom: '-90px',
          left: '-90px',
          width: '370px',
          height: '370px',
          transform: 'rotate(-55deg)',
          opacity: 0.055,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Bottom Center Left */}
        <Box sx={{
          position: 'absolute',
          bottom: '80px',
          left: '30%',
          width: '320px',
          height: '320px',
          transform: 'rotate(-43deg)',
          opacity: 0.04,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Bottom Center */}
        <Box sx={{
          position: 'absolute',
          bottom: '-60px',
          left: '48%',
          width: '340px',
          height: '340px',
          transform: 'rotate(-35deg)',
          opacity: 0.06,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />

        {/* Bottom Right */}
        <Box sx={{
          position: 'absolute',
          bottom: '-120px',
          right: '-120px',
          width: '450px',
          height: '450px',
          transform: 'rotate(-45deg)',
          opacity: 0.05,
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }} />
      </Box>

      <Box sx={{ maxWidth: '800px', mx: 'auto', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                mb: 2,
                flexWrap: 'wrap'
              }}
            >
              {/* Logo */}
              <Box
                component="img"
                src={logo}
                alt="Sunray Logo"
                sx={{
                  height: 56,
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />

              {/* Company Name */}
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.8rem', md: '2.4rem' }
                }}
              >
                Sunray
              </Typography>
            </Box>

            {/* Page Title */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                mt: 1,
                fontSize: { xs: '1.6rem', md: '2.2rem' }
              }}
            >
              Facility Report
            </Typography>

            {/* Subtitle */}
            <Typography
              variant="body1"
              sx={{
                color: '#64748b',
                maxWidth: 520,
                mx: 'auto',
                mt: 1.5,
                lineHeight: 1.6,
                fontSize: '1.05rem'
              }}
            >
              Maintenance & Facility Issues
            </Typography>
          </Box>


          {/* Subtitle */}
          <Typography
            variant="body1"
            sx={{
              color: '#475569',
              maxWidth: 520,
              mx: 'auto',
              lineHeight: 1.7,
              fontSize: '1.05rem'
            }}
          >
            Submit detailed reports for prompt resolution by our facilities team
          </Typography>
        </Box>


        {/* Main Card - Transparent background to show watermarks */}
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 20,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${watermark})`,
              backgroundSize: '300px 300px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'bottom right',
              transform: 'rotate(-45deg)',
              opacity: 0.03,
              zIndex: -1
            }
          }}
        >
          {/* Header Section */}
          <Box sx={{
            p: 4,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1 }}>
              <Build sx={{ fontSize: 200, position: 'absolute', top: -50, right: -50 }} />
            </Box>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 1, position: 'relative', zIndex: 1 }}>
              New Issue Report
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', position: 'relative', zIndex: 1 }}>
              All fields marked with * are required
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            {submitStatus && (
              <Alert
                severity={submitStatus.type}
                sx={{ mb: 4, borderRadius: 2, '& .MuiAlert-icon': { fontSize: 24 } }}
                icon={submitStatus.type === 'success' ? <CheckCircle /> : <Warning />}
              >
                {submitStatus.message}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Row 1: Date/Time & Location */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                      <LocationOn sx={{ fontSize: 20, color: '#2563eb' }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                      Date & Time
                    </Typography>
                  </Box>
                  <TextField
                    type="datetime-local"
                    name="dateTime"
                    value={formData.dateTime}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        backgroundColor: 'grey.50',
                        '& fieldset': { borderColor: 'grey.200' },
                        '&:hover fieldset': { borderColor: 'primary.main' },
                        '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 }
                      }
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                      <LocationOn sx={{ fontSize: 20, color: '#2563eb' }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                      Location/Department *
                    </Typography>
                  </Box>
                  <TextField
                    name="locationDepartment"
                    value={formData.locationDepartment}
                    onChange={handleInputChange}
                    placeholder="e.g., Building A, Floor 3, Room 305 - Engineering"
                    fullWidth
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        backgroundColor: 'grey.50',
                        '& fieldset': { borderColor: 'grey.200' },
                        '&:hover fieldset': { borderColor: 'primary.main' },
                        '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 }
                      }
                    }}
                  />
                </Box>
              </Box>

              {/* Issue Type */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                    <Description sx={{ fontSize: 20, color: '#2563eb' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Issue Type
                  </Typography>
                </Box>
                <FormControl fullWidth required sx={{ bgcolor: 'grey.50', borderRadius: 2.5 }}>
                  <InputLabel>Issue Type </InputLabel>
                  <Select
                    name="issueType"
                    value={formData.issueType}
                    onChange={handleInputChange}
                    label="Issue Type"
                    sx={{ borderRadius: 2.5 }}
                  >
                    {issueTypes.map((type) => (
                      <MenuItem key={type} value={type} sx={{ py: 1.5 }}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Description */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                    <Description sx={{ fontSize: 20, color: '#2563eb' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Description
                  </Typography>
                </Box>
                <TextField
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide detailed information about the issue..."
                  multiline
                  rows={4}
                  fullWidth
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      backgroundColor: 'grey.50',
                      '& fieldset': { borderColor: 'grey.200' },
                      '&:hover fieldset': { borderColor: 'primary.main' },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 }
                    }
                  }}
                />
              </Box>

              {/* Urgency */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                    <PriorityHigh sx={{ fontSize: 20, color: '#2563eb' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Urgency Level
                  </Typography>
                </Box>
                <FormControl fullWidth required sx={{ bgcolor: 'grey.50', borderRadius: 2.5 }}>
                  <InputLabel>Urgency Level </InputLabel>
                  <Select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleInputChange}
                    label="Urgency Level"
                    sx={{ borderRadius: 2.5 }}
                  >
                    {urgencyLevels.map((level) => (
                      <MenuItem key={level.value} value={level.value} sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ color: level.color, fontSize: '1.2em' }}>
                            {level.icon}
                          </Box>
                          <Typography sx={{ fontWeight: 500 }}>{level.value}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {formData.urgency && (
                  <Box sx={{ mt: 1.5 }}>
                    {getUrgencyChip(formData.urgency)}
                  </Box>
                )}
              </Box>

              {/* Image Upload Section */}
              <Paper sx={{ p: 4, borderRadius: 3, border: '2px dashed', borderColor: 'grey.300' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ bgcolor: '#dbeafe', p: 0.75, borderRadius: 2 }}>
                    <CameraAlt sx={{ fontSize: 24, color: '#2563eb' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Photo Evidence (Optional)
                  </Typography>
                </Box>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  id="image-upload"
                />

                {!imagePreview ? (
                  <label htmlFor="image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUpload />}
                      sx={{
                        borderRadius: 3,
                        borderWidth: 2,
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          borderWidth: 2,
                          bgcolor: 'primary.50'
                        }
                      }}
                    >
                      📷 Upload Photo
                    </Button>
                  </label>
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <Paper
                      elevation={8}
                      sx={{
                        position: 'relative',
                        display: 'inline-block',
                        borderRadius: 3,
                        overflow: 'hidden',
                        maxWidth: 300,
                        mx: 'auto'
                      }}
                    >
                      <Box
                        component="img"
                        src={imagePreview}
                        alt="Preview"
                        sx={{
                          width: '100%',
                          height: 240,
                          objectFit: 'cover'
                        }}
                      />
                      <IconButton
                        onClick={removeImage}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' },
                          minWidth: 40,
                          height: 40
                        }}
                      >
                        <Close />
                      </IconButton>
                    </Paper>
                    <Typography variant="body2" sx={{ mt: 2, color: 'success.main', fontWeight: 500 }}>
                      ✓ Image compressed and ready (under 50KB)
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Contact Section */}
              <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'primary.50' }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 3,
                    fontWeight: 700,
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}
                >
                  <Person sx={{ fontSize: 28 }} />
                  Contact Information
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ bgcolor: 'white', p: 0.5, borderRadius: '50%' }}>
                        <Person sx={{ fontSize: 20, color: 'primary.main' }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Full Name *</Typography>
                    </Box>
                    <TextField
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'white',
                          '& fieldset': { borderColor: 'grey.200' }
                        }
                      }}
                    />
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ bgcolor: 'white', p: 0.5, borderRadius: '50%' }}>
                        <Email sx={{ fontSize: 20, color: 'primary.main' }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Email *</Typography>
                    </Box>
                    <TextField
                      name="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      fullWidth
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'white',
                          '& fieldset': { borderColor: 'grey.200' }
                        }
                      }}
                    />
                  </Box>

                  <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ bgcolor: 'white', p: 0.5, borderRadius: '50%' }}>
                        <ContactPhone sx={{ fontSize: 20, color: 'primary.main' }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Phone (Optional)</Typography>
                    </Box>
                    <TextField
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number for faster response"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'white',
                          '& fieldset': { borderColor: 'grey.200' }
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Paper>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  py: 2.5,
                  borderRadius: 3,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: 6,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: 12
                  },
                  '&:disabled': {
                    background: 'grey.400',
                    transform: 'none'
                  }
                }}
                startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <Send />}
              >
                {loading ? 'Processing Report...' : 'Submit Facility Report'}
              </Button>
              <Dialog
                open={successDialogOpen}
                onClose={() => setSuccessDialogOpen(false)}
                maxWidth="sm"
                fullWidth
              >
                <DialogTitle
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    fontWeight: 700,
                    color: 'success.main'
                  }}
                >
                  <CheckCircle color="success" fontSize="large" />
                  Report Submitted Successfully
                </DialogTitle>

                <DialogContent>
                  <Typography sx={{ mt: 1, color: 'grey.700', lineHeight: 1.6 }}>
                    Thank you for submitting the facility report.
                    <br /><br />
                    Our <strong>Sunray Facilities Team</strong> has received your request and
                    will take action as soon as possible.
                  </Typography>

                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'success.50',
                      border: '1px solid',
                      borderColor: 'success.200'
                    }}
                  >
                  </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3 }}>
                  <Button
                    onClick={() => setSuccessDialogOpen(false)}
                    variant="contained"
                    sx={{
                      px: 4,
                      borderRadius: 3,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                    }}
                  >
                    Done
                  </Button>
                </DialogActions>
              </Dialog>

            </Box>
          </CardContent>
        </Paper>
      </Box>
    </Box>
  );
}