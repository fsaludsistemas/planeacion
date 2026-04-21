import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  IconButton,
  Container,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import '../styles/page1.css';

const Page1 = () => {
  const [data, setData] = useState({ ejes: [], estrategias: [], programas: [], objetivos: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editState, setEditState] = useState({});

  const userPermissions = JSON.parse(sessionStorage.getItem('logged'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ejesResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'EJES' });
        const estrategiasResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'ESTRATEGIAS' });
        const programasResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'PROGR_INST' });
        const objetivosResponse = await axios.post('https://planeacion-server.vercel.app/getData', { sheetName: 'OBJ_DEC' });

        setData({
          ejes: ejesResponse.data.data,
          estrategias: estrategiasResponse.data.data,
          programas: programasResponse.data.data,
          objetivos: objetivosResponse.data.data,
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (type, id, save = false) => {
    if (save) {
      const newName = document.getElementById(`${type}-${id}`).value;

      const payload = {
        updateData: [id, newName],
        id,
        sheetName: type.toUpperCase() + 'S',
      };

      console.log('Datos a enviar:', payload);

      axios
        .post('https://planeacion-server.vercel.app/updateData', payload)
        .then((response) => {
          console.log('Respuesta del servidor:', response);
          const newData = { ...data };
          newData[type + 's'] = newData[type + 's'].map(item =>
            item.id === id ? { ...item, nombre: newName } : item
          );
          setData(newData);
          setEditState({ ...editState, [`${type}-${id}`]: false });
        })
        .catch((error) => {
          console.error('Error updating data:', error);
        });
    } else {
      setEditState({ ...editState, [`${type}-${id}`]: true });
    }
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <div>Error loading data: {error.message}</div>;
  }

  return (
    <Container className="mt-5">
      <Typography variant="h4" gutterBottom>
        Ejes, Estrategias y Objetivos Decanato
      </Typography>
      {data.ejes.map((eje, i) => (
        <Accordion key={i}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#e3e4e5' }}>
            {editState[`eje-${eje.id}`] ? (
              <TextField
                id={`eje-${eje.id}`}
                defaultValue={eje.nombre}
                variant="outlined"
                size="small"
              />
            ) : (
              <Typography id={`eje-display-${eje.id}`}>{eje.nombre}</Typography>
            )}
            {userPermissions.permiso === 'Sistemas' && (
              <div className="edit-buttons">
                <IconButton color="primary" size="small" onClick={() => handleEdit('eje', eje.id)}>
                  <EditIcon />
                </IconButton>
                {editState[`eje-${eje.id}`] && (
                  <IconButton color="secondary" size="small" onClick={() => handleEdit('eje', eje.id, true)}>
                    <SaveIcon />
                  </IconButton>
                )}
              </div>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ backgroundColor: '#fff' }}>
            <div>
              <Typography variant="h6">Estrategias</Typography>
              {data.estrategias.filter((e) => e.id_eje === eje.id).map((estrategia, j) => (
                <Accordion key={j}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#e3e4e5' }}>
                    {editState[`estrategia-${estrategia.id}`] ? (
                      <TextField
                        id={`estrategia-${estrategia.id}`}
                        defaultValue={estrategia.nombre}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography id={`estrategia-display-${estrategia.id}`}>{estrategia.nombre}</Typography>
                    )}
                    {userPermissions.permiso === 'Sistemas' && (
                      <div className="edit-buttons">
                        <IconButton color="primary" size="small" onClick={() => handleEdit('estrategia', estrategia.id)}>
                          <EditIcon />
                        </IconButton>
                        {editState[`estrategia-${estrategia.id}`] && (
                          <IconButton color="secondary" size="small" onClick={() => handleEdit('estrategia', estrategia.id, true)}>
                            <SaveIcon />
                          </IconButton>
                        )}
                      </div>
                    )}
                  </AccordionSummary>
                  <AccordionDetails sx={{ backgroundColor: '#fff' }}>
                    <div className="table-container">
                      <div className="objetivo-table">
                        <Typography variant="h6">Objetivos</Typography>
                        <table>
                          <thead>
                            <tr>
                              <th>Objetivo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.objetivos.filter((o) => o.id_estrategia === estrategia.id).map((objetivo, l) => (
                              <tr key={l}>
                                <td style={{ display: 'flex', alignItems: 'center' }}>
                                  {editState[`objetivo-${objetivo.id}`] ? (
                                    <TextField
                                      id={`objetivo-${objetivo.id}`}
                                      defaultValue={objetivo.nombre}
                                      variant="outlined"
                                      size="small"
                                    />
                                  ) : (
                                    <Typography id={`objetivo-display-${objetivo.id}`}>{objetivo.nombre}</Typography>
                                  )}
                                  {userPermissions.permiso === 'Sistemas' && (
                                    <>
                                      <IconButton color="primary" size="small" onClick={() => handleEdit('objetivo', objetivo.id)}>
                                        <EditIcon />
                                      </IconButton>
                                      {editState[`objetivo-${objetivo.id}`] && (
                                        <IconButton color="secondary" size="small" onClick={() => handleEdit('objetivo', objetivo.id, true)}>
                                          <SaveIcon />
                                        </IconButton>
                                      )}
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </AccordionDetails>
                </Accordion>
              ))}
            </div>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
};

export default Page1;
