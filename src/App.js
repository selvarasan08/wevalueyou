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
  LocationOn,
  Description,
  PriorityHigh,
  ContactPhone,
  Email,
  Person,
  CameraAlt,
} from '@mui/icons-material';
import watermark from './waterMark-removebg-preview.png';
import logo from './waterMark-removebg-preview.png';
import emailjs from '@emailjs/browser';

export default function FacilityIssuesReport() {
  const [formData, setFormData] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    locationDepartment: '',
    otherLocation: '',
    issueType: '',
    otherIssue: '',
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
  const EMAILJS_SERVICE_ID = 'service_86b6tiv';
  const EMAILJS_TEMPLATE_ID = 'template_fq4ph58';
  const EMAILJS_PUBLIC_KEY = '2sce3923pCPmotTCy';

  const locations = [
    'Sunray HQ',
    'Bukit Batok',
    'Kallang Bahru',
    'Sunray Hub',
    'Others'
  ];

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
    { value: 'Low', color: '#74e950' },
    { value: 'Medium', color: '#d2e950' },
    { value: 'High', color: '#1a0b6d' },
    { value: 'Emergency', color: '#ec0606' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ... (keep all existing compressImage, handleImageUpload, removeImage functions unchanged)

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
    const required = ['description', 'urgency'];
    for (let field of required) {
      if (!formData[field]) {
        return false;
      }
    }
    // Location is required but can be "Others" with otherLocation
    if (!formData.locationDepartment) {
      return false;
    }
    // Issue type is required but can be "Other" with otherIssue
    if (!formData.issueType) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill in all required fields (Description, Urgency, Location, Issue Type)',
      });
      return;
    }

    setLoading(true);
    setSubmitStatus(null);

    try {
      const templateParams = {
        report_date: new Date(formData.dateTime).toLocaleString(),
        location_department: formData.locationDepartment === 'Others' ? formData.otherLocation : formData.locationDepartment,
        issue_type: formData.issueType === 'Other' ? formData.otherIssue : formData.issueType,
        description: formData.description,
        urgency: formData.urgency,
        contact_name: formData.contactName || 'N/A',
        contact_email: formData.contactEmail || 'N/A',
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
        setSuccessDialogOpen(true);

        setTimeout(() => {
          setFormData({
            dateTime: new Date().toISOString().slice(0, 16),
            locationDepartment: '',
            otherLocation: '',
            issueType: '',
            otherIssue: '',
            description: '',
            urgency: '',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
          });
          removeImage();
          setSuccessDialogOpen(false);
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
      {/* ... (keep all watermark styling unchanged) */}

      <Box sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}>
        {Array.from({ length: 14 }).map((_, row) =>
          Array.from({ length: 14 }).map((_, col) => {
            const size = 260;
            const gap = 230;
            const rotation = -45;

            // 🚀 EXTENDED GRID ORIGIN (KEY FIX)
            const r = row - 5;
            const c = col - 5;

            return (
              <Box
                key={`${row}-${col}`}
                sx={{
                  position: 'absolute',

                  // 🔥 DIAGONAL-SAFE POSITIONING
                  left: `${c * gap - r * gap}px`,
                  top: `${r * gap}px`,

                  width: size,
                  height: size,
                  transform: `rotate(${rotation}deg)`,
                  opacity: 0.09,

                  backgroundImage: `url(${watermark})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                }}
              />
            );
          })
        )}
      </Box>





      <Box sx={{ maxWidth: '800px', mx: 'auto', position: 'relative', zIndex: 10 }}>
        {/* Header - unchanged */}
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
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #e95950 0%, #232270 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mt: 1,
                fontSize: { xs: '1.6rem', md: '2.2rem' }
              }}
            >
              Facility Report
            </Typography>
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

        {/* Main Card */}
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 20,
            border: '1px solid rgba(233, 89, 80, 0.1)'
          }}
        >
          {/* Header Section - unchanged */}
          <Box sx={{
            p: 4,
            background: 'linear-gradient(135deg, #e95950 0%, #232270 50%, #1a1f3d 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
              New Issue Report
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Required fields: Location, Issue Type, Description, Urgency
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
              {/* Row 1: Date/Time & Location Dropdown */}
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
                  <FormControl fullWidth required sx={{ bgcolor: 'grey.50', borderRadius: 2.5 }}>
                    <InputLabel>Location/Department</InputLabel>
                    <Select
                      name="locationDepartment"
                      value={formData.locationDepartment}
                      onChange={handleInputChange}
                      label="Location/Department"
                    >
                      {locations.map((location) => (
                        <MenuItem key={location} value={location} sx={{ py: 1.5 }}>
                          {location}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Other Location Field */}
                  {formData.locationDepartment === 'Others' && (
                    <TextField
                      name="otherLocation"
                      value={formData.otherLocation}
                      onChange={handleInputChange}
                      placeholder="Please specify the location..."
                      fullWidth
                      sx={{
                        mt: 2,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2.5,
                          backgroundColor: 'grey.50',
                          '& fieldset': { borderColor: 'grey.200' }
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>

              {/* Issue Type */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                    <Description sx={{ fontSize: 20, color: '#2563eb' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Issue Type *
                  </Typography>
                </Box>
                <FormControl fullWidth required sx={{ bgcolor: 'grey.50', borderRadius: 2.5 }}>
                  <InputLabel>Issue Type</InputLabel>
                  <Select
                    name="issueType"
                    value={formData.issueType}
                    onChange={handleInputChange}
                    label="Issue Type"
                  >
                    {issueTypes.map((type) => (
                      <MenuItem key={type} value={type} sx={{ py: 1.5 }}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Other Issue Field */}
                {formData.issueType === 'Other' && (
                  <TextField
                    name="otherIssue"
                    value={formData.otherIssue}
                    onChange={handleInputChange}
                    placeholder="Please specify the issue type..."
                    fullWidth
                    sx={{
                      mt: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        backgroundColor: 'grey.50',
                        '& fieldset': { borderColor: 'grey.200' }
                      }
                    }}
                  />
                )}
              </Box>

              {/* Description - Required */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                    <Description sx={{ fontSize: 20, color: '#2563eb' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Description *
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

              {/* Urgency - Required */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ bgcolor: '#e8e5ff', p: 0.5, borderRadius: '50%' }}>
                    <PriorityHigh sx={{ fontSize: 20, color: '#505de9' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                    Urgency Level *
                  </Typography>
                </Box>
                <FormControl fullWidth required sx={{ bgcolor: 'grey.50', borderRadius: 2.5 }}>
                  <InputLabel>Urgency Level</InputLabel>
                  <Select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleInputChange}
                    label="Urgency Level"
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
              <Paper sx={{
                p: 4,
                borderRadius: 3,
                border: '2px dashed',
                borderColor: 'rgba(80, 108, 233, 0.3)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ bgcolor: '#e7e5ff', p: 0.75, borderRadius: 2 }}>
                    <CameraAlt sx={{ fontSize: 24, color: '#5250e9' }} />
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



              {/* Contact Section - Optional */}
              <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#f8f9ff' }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#525252', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Person sx={{ fontSize: 28, color: '#6750e9' }} />
                  Contact Information (Optional)
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                        <Person sx={{ fontSize: 20, color: '#2563eb' }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Full Name</Typography>
                    </Box>
                    <TextField
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
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

                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                        <Email sx={{ fontSize: 20, color: '#2563eb' }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Email</Typography>
                    </Box>
                    <TextField
                      name="contactEmail"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
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

                  <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ bgcolor: '#dbeafe', p: 0.5, borderRadius: '50%' }}>
                        <ContactPhone sx={{ fontSize: 20, color: '#2563eb' }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Phone</Typography>
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


              {/* Submit Button - unchanged */}
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
                  background: 'linear-gradient(135deg, #e95950 0%, #232270 100%)',
                  boxShadow: '0 10px 30px rgba(233, 89, 80, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #d94a42 0%, #1a1f3d 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 15px 40px rgba(233, 89, 80, 0.5)'
                  }
                }}
                startIcon={loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : <Send sx={{ color: 'white' }} />}
              >
                {loading ? 'Processing Report...' : 'Submit Facility Report'}
              </Button>

              {/* Success Dialog - unchanged */}
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
