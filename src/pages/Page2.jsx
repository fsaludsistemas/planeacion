import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Container,
  CircularProgress,
  Paper,
  Divider,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import '../styles/page1.css';

const Page2 = () => {
  const [data, setData] = useState({ escOfi: [], objDec: [], indicadores: [], metas: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [indicatorContent, setIndicatorContent] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState(null); 
  const [newIndicator, setNewIndicator] = useState({
    nombre: '',
    oficinaEscuela: '',
    meta2024: '',
    meta2025: '',
    meta2026: '',
    responsable: '',
    coequipero: '' 
  });
  const [emailError, setEmailError] = useState(''); 
  const [creatingIndicator, setCreatingIndicator] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false); 
  const [selectedObjDecId, setSelectedObjDecId] = useState(null);
  const [selectedEscOfiId, setSelectedEscOfiId] = useState(null); 
  const [editAvanceState, setEditAvanceState] = useState(false);
  const [currentAvance, setCurrentAvance] = useState('');

  useEffect(() => {
    setNewIndicator((prevState) => ({
      ...prevState,
      plantillaId: '', 
    }));
  }, []);
  

  const userPermissions = JSON.parse(sessionStorage.getItem('logged'));

  const fetchData = async () => {
    try {
      const escOfiResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'ESC_OFI' });
      const objDecResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'OBJ_DEC' });
      const indicadoresResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'INDICADORES' });
      const metasResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'METAS' });

      setData({
        escOfi: escOfiResponse.data.data,
        objDec: objDecResponse.data.data,
        indicadores: indicadoresResponse.data.data,
        metas: metasResponse.data.data,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : null); 
    setSelectedIndicator(null); 
    setIndicatorContent(null); 
  };

  const handleIndicatorClick = (indicator) => {
    setSelectedIndicator(indicator.id);
    setIndicatorContent(indicator);
  };

  const getMetaForCurrentYear = (indicatorId) => {
    const currentYear = new Date().getFullYear().toString();
    const metaRow = data.metas.find(meta => meta.id_indicador === indicatorId);
    return metaRow ? metaRow[currentYear] : 'No disponible';
  };

  const getAvanceForCurrentYear = (indicatorId) => {
    const currentYear = new Date().getFullYear();
    const ejecColumn = `ejec_${currentYear}`;
    const metaRow = data.metas.find(meta => meta.id_indicador === indicatorId);
    if (metaRow && metaRow[ejecColumn]) {
      return metaRow[ejecColumn];
    }
    return '';
  };

  const handleAvanceEdit = () => {
    setEditAvanceState(true);
    setCurrentAvance(getAvanceForCurrentYear(selectedIndicator));
  };

  const handleAvanceSave = () => {
    const currentYear = new Date().getFullYear();
    const ejecColumn = `ejec_${currentYear}`;

    const payload = {
      id: selectedIndicator,
      sheetName: 'METAS',
      updateData: [ejecColumn, currentAvance]
    };

    axios.post('https://planeacion-server.vercel.app/updateMetas', payload) 
      .then((response) => {
        console.log('Avance actualizado:', response);
        const newData = { ...data };
        const metaIndex = newData.metas.findIndex(meta => meta.id_indicador === selectedIndicator);
        if (metaIndex !== -1) {
          newData.metas[metaIndex][ejecColumn] = currentAvance;
        }
        setData(newData);
        setEditAvanceState(false);
      })
      .catch((error) => {
        console.error('Error updating avance:', error.response ? error.response.data : error.message);
      });
  };

  const validateEmail = (email) => {
    const universityEmailPattern = /^[a-zA-Z0-9._%+-]+@correounivalle\.edu\.co$/;
    return universityEmailPattern.test(email);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIndicator({ ...newIndicator, [name]: value });

    if (name === 'responsable') {
      if (!validateEmail(value)) {
        setEmailError('El correo debe ser del dominio @correounivalle.edu.co');
      } else {
        setEmailError('');
      }
    }
  };

  const openCreateDialog = (objDecId, escOfiId) => {
    setSelectedObjDecId(objDecId);
    setSelectedEscOfiId(escOfiId); 
    setOpenDialog(true); 
  };

  const [plantillas, setPlantillas] = useState([]);

  const fetchPlantillas = async () => {
    try {
      const response = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'PLANTILLAS' });
      console.log("plantillas", response);
      setPlantillas(response.data.data);
    } catch (error) {
      console.error('Error fetching plantillas:', error);
    }
  };
  
  useEffect(() => {
    fetchPlantillas();
  }, []);
  
  const handleCreateIndicator = () => {
    if (emailError || !validateEmail(newIndicator.responsable)) {
      alert('Por favor, ingresa un correo válido del dominio @correounivalle.edu.co.');
      return;
    }

    setCreatingIndicator(true); 

    const tipoOficinaEscuela = hasSchoolPermissions ? 'Escuela' : 'Oficina'; 

    const payload = {
      nombre: newIndicator.nombre,
      oficinaEscuela: selectedEscOfiId, 
      id_obj_dec: selectedObjDecId,    
      responsable: newIndicator.responsable,
      coequipero: newIndicator.coequipero,
      meta2024: newIndicator.meta2024,
      meta2025: newIndicator.meta2025,
      meta2026: newIndicator.meta2026,
      tipoOficinaEscuela: tipoOficinaEscuela, 
      plantillaId: newIndicator.plantillaId, // Agregamos la plantilla seleccionada
    };
  
    axios.post('https://planeacion-server.vercel.app/createIndicator', payload)
      .then((response) => {
        console.log('Indicador creado:', response);
        setCreatingIndicator(false); 
        setSuccessDialogOpen(true); 
        setOpenDialog(false); 
        // Limpiar el formulario después de crear el indicador
        setNewIndicator({
          nombre: '',
          oficinaEscuela: '',
          meta2024: '',
          meta2025: '',
          meta2026: '',
          responsable: '',
          coequipero: '',
          plantillaId: '',
        });
      })
      .catch((error) => {
        console.error('Error creando indicador:', error);
        setCreatingIndicator(false); 
      });
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <div>Error loading data: {error.message}</div>;
  }

  const filteredEscOfi = data.escOfi.filter((item) => {
    if (userPermissions.permiso === 'Escuela_jefe' || userPermissions.permiso === 'Escuela_prof') {
      return item.id === userPermissions.id_escuela;
    } else if (userPermissions.permiso === 'Oficina_jefe') {
      return item.id === userPermissions.id_oficina;
    }
    return true;
  });

  const hasSchoolPermissions = filteredEscOfi.some(item => item.tipo === 'Escuela');
  const hasOfficePermissions = filteredEscOfi.some(item => item.tipo === 'Oficina');

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false); // Cerrar el mensaje de éxito
    fetchData(); // Actualizar los datos para que el usuario vea el indicador recién creado
  };

  return (
    <Container className="mt-5">
      <Typography variant="h4" gutterBottom>
        Indicadores por Dependencia
      </Typography>
      {hasOfficePermissions && (
        <div>
          <Typography variant="h5" sx={{ marginTop: '30px', marginBottom: '10px' }}>Oficinas</Typography>
          {filteredEscOfi.filter((item) => item.tipo === 'Oficina').map((escOfi, j) => (
            <Accordion
              key={j}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#e3e4e5' }}>
                <Typography>{escOfi.nombre}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: '#fff' }}>
                {data.objDec
                  .filter((objDec) => data.indicadores.some((indicador) => indicador.id_obj_dec === objDec.id && indicador.id_esc_ofi === escOfi.id)) 
                  .map((objDec) => (
                    <Accordion
                      key={objDec.id}
                      expanded={expandedAccordion === objDec.id} 
                      onChange={handleAccordionChange(objDec.id)} 
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#e3e4e5' }}>
                        <Typography>{objDec.nombre}</Typography>
                        {userPermissions.permiso === 'Sistemas' && (
                          <IconButton 
                            color="primary" 
                            size="small" 
                            onClick={() => openCreateDialog(objDec.id, escOfi.id)} 
                          >
                            <AddIcon />
                          </IconButton>
                        )}
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={5}>
                            {data.indicadores
                              .filter((indicador) => indicador.id_obj_dec === objDec.id && indicador.id_esc_ofi === escOfi.id)
                              .map((indicador) => (
                                <Button
                                  key={indicador.id}
                                  variant="contained"
                                  onClick={() => handleIndicatorClick(indicador)}
                                  sx={{
                                    display: 'block',
                                    marginBottom: '10px',
                                    backgroundColor: selectedIndicator === indicador.id ? '#919292' : '#b4b6b9',
                                    color: 'black',
                                    '&:hover': {
                                      backgroundColor: selectedIndicator === indicador.id ? '#e3e4e5' : '#e3e4e5',
                                    },
                                  }}
                                >
                                  {indicador.indicador}
                                </Button>
                              ))}
                          </Grid>
                          <Grid item xs={7}>
                            {indicatorContent && selectedIndicator === indicatorContent.id && (
                              <Paper sx={{ padding: '20px' }}>
                                <Typography variant="h6"><strong>{indicatorContent.indicador}</strong></Typography>
                                <Typography>{indicatorContent.descripcion}</Typography>
                                <Typography>Meta {new Date().getFullYear()}: {getMetaForCurrentYear(indicatorContent.id)}</Typography>
                                <Grid item xs={12}>
                                  <Typography>
                                    Avance {new Date().getFullYear()}:
                                  </Typography>
                                  {editAvanceState ? (
                                    <>
                                      <TextField
                                        size="small"
                                        value={currentAvance}
                                        onChange={(e) => setCurrentAvance(e.target.value)}
                                      />
                                      <IconButton onClick={handleAvanceSave}>
                                        <SaveIcon />
                                      </IconButton>
                                    </>
                                  ) : (
                                    <>
                                      <Typography component="span">
                                        {getAvanceForCurrentYear(indicatorContent.id)}
                                      </Typography>
                                      <IconButton onClick={handleAvanceEdit} disabled={userPermissions.permiso !== 'Sistemas' && userPermissions.permiso !== 'Escuela_prof'}>
                                        <EditIcon />
                                      </IconButton>
                                    </>
                                  )}
                                </Grid>
                                <Divider sx={{ width: '100%', marginY: '10px', borderWidth: '2px', borderColor: 'black' }} />
                                <Typography>Responsable: {indicatorContent.responsable}</Typography>
                                <Typography>Coequipero: {indicatorContent.coequipero || 'NA'}</Typography>
                                <Typography>
                                  Enlace al registro del avance del indicador: <a href={indicatorContent.url_indicador} target="_blank" rel="noopener noreferrer">Enlace</a>
                                </Typography>
                              </Paper>
                            )}
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      )}
      {hasSchoolPermissions && (
        <div>
          <Typography variant="h5" sx={{ marginTop: '30px', marginBottom: '10px' }}>Escuelas</Typography>
          {filteredEscOfi.filter((item) => item.tipo === 'Escuela').map((escOfi, j) => (
            <Accordion
              key={j}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#e3e4e5' }}>
                <Typography>{escOfi.nombre}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: '#fff' }}>
                {data.objDec
                  .filter((objDec) => data.indicadores.some((indicador) => indicador.id_obj_dec === objDec.id && indicador.id_esc_ofi === escOfi.id)) 
                  .map((objDec) => (
                    <Accordion
                      key={objDec.id}
                      expanded={expandedAccordion === objDec.id} 
                      onChange={handleAccordionChange(objDec.id)} 
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{objDec.nombre}</Typography>
                        {userPermissions.permiso === 'Sistemas' && (
                          <IconButton 
                            color="primary" 
                            size="small" 
                            onClick={() => openCreateDialog(objDec.id, escOfi.id)} 
                          >
                            <AddIcon />
                          </IconButton>
                        )}
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={5}>
                            {data.indicadores
                              .filter((indicador) => indicador.id_obj_dec === objDec.id && indicador.id_esc_ofi === escOfi.id)
                              .map((indicador) => (
                                <Button
                                  key={indicador.id}
                                  variant="contained"
                                  onClick={() => handleIndicatorClick(indicador)}
                                  sx={{
                                    display: 'block',
                                    marginBottom: '10px',
                                    backgroundColor: '#1976d2',
                                    color: 'white',
                                  }}
                                >
                                  {indicador.indicador}
                                </Button>
                              ))}
                          </Grid>
                          <Grid item xs={7}>
                            {indicatorContent && selectedIndicator === indicatorContent.id && (
                              <Paper sx={{ padding: '20px' }}>
                                <Typography variant="h6">{indicatorContent.indicador}</Typography>
                                <Typography>{indicatorContent.descripcion}</Typography>
                                <Typography>Meta {new Date().getFullYear()}: {getMetaForCurrentYear(indicatorContent.id)}</Typography>
                                <Divider sx={{ width: '100%', marginY: '10px', borderWidth: '2px', borderColor: 'black' }} />
                                <Typography>Responsable: {indicatorContent.responsable}</Typography>
                              </Paper>
                            )}
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      )}
  
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Crear Indicador</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Nombre del Indicador"
            type="text"
            fullWidth
            name="nombre"
            value={newIndicator.nombre}
            onChange={handleInputChange}
            sx={{ marginBottom: '10px' }} 
          />
          <TextField
            margin="dense"
            label="Meta 2024"
            type="number"
            fullWidth
            name="meta2024"
            value={newIndicator.meta2024}
            onChange={handleInputChange}
            sx={{ marginBottom: '10px' }} 
          />
          <TextField
            margin="dense"
            label="Meta 2025"
            type="number"
            fullWidth
            name="meta2025"
            value={newIndicator.meta2025}
            onChange={handleInputChange}
            sx={{ marginBottom: '10px' }} 
          />
          <TextField
            margin="dense"
            label="Meta 2026"
            type="number"
            fullWidth
            name="meta2026"
            value={newIndicator.meta2026}
            onChange={handleInputChange}
            sx={{ marginBottom: '10px' }} 
          />
          <TextField
            margin="dense"
            label="Responsable"
            type="email"
            fullWidth
            name="responsable"
            value={newIndicator.responsable}
            onChange={handleInputChange}
            error={!!emailError}
            helperText={emailError} 
            sx={{ marginBottom: '10px' }} 
          />
          {/* Select para el Coequipero */}
          <Select
            fullWidth
            value={newIndicator.coequipero}
            onChange={(e) => setNewIndicator({ ...newIndicator, coequipero: e.target.value })}
            displayEmpty
            sx={{ marginBottom: '10px' }} 
          >
            <MenuItem value="" disabled>Selecciona un coequipero</MenuItem>
            <MenuItem value="NA">NA</MenuItem> {/* Opción NA */}
            {data.escOfi.map((escOfi) => (
              <MenuItem key={escOfi.id} value={escOfi.nombre}>
                {escOfi.nombre}
              </MenuItem>
            ))}
          </Select>
          {/* Select para el Tipo de Plantilla */}
          <Select
            fullWidth
            value={newIndicator.plantillaId}
            onChange={(e) => setNewIndicator({ ...newIndicator, plantillaId: e.target.value })}
            displayEmpty
            sx={{ marginBottom: '16px' }} 
          >
            <MenuItem value="" disabled>Selecciona una plantilla</MenuItem>
            {plantillas.map((plantilla) => (
              <MenuItem key={plantilla.id} value={plantilla.id}>
                {plantilla.nombre_plantilla}  
              </MenuItem>
            ))}
          </Select>


          {creatingIndicator && <CircularProgress sx={{ marginTop: '20px' }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleCreateIndicator} color="primary">
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle>Indicador Creado</DialogTitle>
        <DialogContent>
          <Typography>El indicador ha sido creado exitosamente.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleSuccessDialogClose()} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Page2;
