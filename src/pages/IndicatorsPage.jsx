import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import '../styles/indicators.css';

const toArray = (value) => (Array.isArray(value) ? value : []);

const INITIAL_FILTERS = {
  ejeId: '',
  estrategiaId: '',
  programaId: '',
  impactoId: '',
  objetivoDecanatoId: '',
  dependenciaId: '',
  tipoDependencia: 'TODAS',
  periodoId: '',
  periodoActual: 'TODOS',
};

const toText = (value) => {
  if (value === undefined || value === null) {
    return 'No disponible';
  }

  const normalized = String(value).trim();
  return normalized === '' ? 'No disponible' : normalized;
};

const toFilterValue = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized;
};

const parseNumberishValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const isPercent = raw.includes('%');
  const normalized = raw.replace('%', '').replace(',', '.').trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return { parsed, isPercent };
};

const getTrienioTotal = (values) => {
  const validValues = values
    .map((value) => parseNumberishValue(value))
    .filter((value) => value !== null);

  if (!validValues.length) {
    return 'No disponible';
  }

  const total = validValues.reduce((acc, item) => acc + item.parsed, 0);
  const hasPercent = validValues.some((item) => item.isPercent);
  const rounded = Number.isInteger(total) ? String(total) : total.toFixed(2);

  return hasPercent ? `${rounded}%` : rounded;
};

const getDependencyDisplay = (dependencia) => {
  if (!dependencia) {
    return 'No disponible';
  }

  const nombre = toText(dependencia.nombre);
  return nombre;
};

const toBoolean = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí';
};

const normalizeDependencyType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'oficina') {
    return 'Oficina';
  }

  if (normalized === 'escuela') {
    return 'Escuela';
  }

  return 'No definido';
};

const getObjectiveDisplay = (objetivo) => {
  if (!objetivo) {
    return 'No disponible';
  }

  const code = String(objetivo.id_obj_deca || '').trim();
  const text = toText(objetivo.objetivo);

  return code ? `${code}. ${text}` : text;
};

const getPeriodoIdFromIndicator = (indicador) => {
  const raw =
    indicador.id_periodo ||
    indicador.id_peridodo ||
    indicador.id_periododo ||
    indicador.idPeridodo ||
    '';

  return String(raw).trim();
};

const getPeriodoLabel = (periodo) => {
  const anioInicial = String(periodo?.anio_ini || '').trim();
  const anioFinal = String(periodo?.anio_final || '').trim();

  if (anioInicial && anioFinal) {
    return `${anioInicial}-${anioFinal}`;
  }

  return anioInicial || anioFinal || 'No disponible';
};

const buildOptions = (items, getValue, getLabel) => {
  const map = new Map();

  items.forEach((item) => {
    const value = String(getValue(item) || '').trim();
    if (!value || map.has(value)) {
      return;
    }

    map.set(value, getLabel(item));
  });

  return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'es', { sensitivity: 'base' })
  );
};

const IndicatorsPage = ({ data }) => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [expandedRowKey, setExpandedRowKey] = useState(null);

  const dependencias = toArray(data?.DEPENDENCIAS);
  const indicadores = useMemo(() => {
    return toArray(data?.INDICADORES).sort((a, b) => Number(a.id) - Number(b.id));
  }, [data]);
  const periodos = toArray(data?.PERIODO);
  const ejes = toArray(data?.EJE);
  const estrategias = toArray(data?.ESTRATEGIA);
  const programas = toArray(data?.PROGRAMAS);
  const proyectos = toArray(data?.PROYECTOS);
  const impactos = toArray(data?.IMPACTOS);
  const objDeca = toArray(data?.OBJ_DECA);
  const objActor = toArray(data?.OBJ_ACTOR);
  const actores = toArray(data?.ACTORES);
  const metas = toArray(data?.METAS);
  const avances = toArray(data?.AVANCES);

  const dependenciaById = useMemo(() => {
    return new Map(dependencias.map((item) => [String(item.id), item]));
  }, [dependencias]);

  const periodoById = useMemo(() => {
    return new Map(periodos.map((item) => [String(item.id), item]));
  }, [periodos]);

  const currentPeriodoIds = useMemo(() => {
    return new Set(
      periodos
        .filter((item) => toBoolean(item.actual))
        .map((item) => String(item.id))
    );
  }, [periodos]);

  const indicatorRows = useMemo(() => {
    return indicadores.map((indicador, index) => {
      const idIndicador = String(indicador.id);
      const dependencia = dependenciaById.get(String(indicador.id_dependencia));

      const ejeByIndicator = ejes.find((item) => String(item.id_indicador) === idIndicador);

      const programa =
        programas.find((item) => String(item.id) === String(indicador.id_programa)) || null;

      const estrategia =
        (programa &&
          estrategias.find((item) => String(item.id) === String(programa.id_estrategia))) ||
        (ejeByIndicator &&
          estrategias.find((item) => String(item.id_eje) === String(ejeByIndicator.id))) ||
        estrategias.find((item) => String(item.id) === String(indicador.id_estrategia)) ||
        null;

      const eje =
        ejeByIndicator ||
        (estrategia && ejes.find((item) => String(item.id) === String(estrategia.id_eje))) ||
        null;

      const proyecto =
        proyectos.find((item) => String(item.id) === String(indicador.id_proyecto)) ||
        proyectos.find((item) => String(item.id_indicador) === idIndicador) ||
        null;

      const impacto =
        impactos.find((item) => String(item.id) === String(indicador.id_impacto)) ||
        impactos.find((item) => String(item.id_indicador) === idIndicador) ||
        null;

      const objetivoDecanato =
        objDeca.find((item) => String(item.id_indicador) === idIndicador) ||
        objDeca.find((item) => String(item.id_obj_deca) === String(indicador.id_obj_dec)) ||
        objDeca.find((item) => String(item.id) === String(indicador.id_obj_dec)) ||
        null;

      const objetivoDependencia =
        objActor.find((item) => String(item.id) === String(indicador.id_obj_ofi)) ||
        objActor.find((item) => String(item.id_dependencia) === String(indicador.id_dependencia)) ||
        null;

      const actor = actores.find((item) => String(item.id_indicador) === idIndicador) || null;
      const responsable = actor ? dependenciaById.get(String(actor.responsable0)) : null;
      const responsableDirecto = actor
        ? dependenciaById.get(String(actor.responsable_indirecto))
        : null;

      const meta = metas.find((item) => String(item.id_indicador) === idIndicador) || null;
      const avance = avances.find((item) => String(item.id_indicador) === idIndicador) || null;

      const totalMeta =
        meta?.total_trieno ||
        getTrienioTotal([meta?.meta_2024, meta?.meta_2025, meta?.meta_2026]);

      const totalAvance = getTrienioTotal([
        avance?.avance2024,
        avance?.avance2025,
        avance?.avance2026,
      ]);

      const periodoId = getPeriodoIdFromIndicator(indicador);
      const periodo = periodoById.get(periodoId);
      const esPeriodoActual = periodoId ? currentPeriodoIds.has(periodoId) : false;
      const periodoLabel = getPeriodoLabel(periodo);
      const objetivoDecanatoLabel = getObjectiveDisplay(objetivoDecanato);
      const dependenciaLabel = getDependencyDisplay(dependencia);
      const rowKey = `${idIndicador}-${periodoId || 'sin-periodo'}-${index}`;

      return {
        rowKey,
        indicador,
        idIndicador,
        dependencia,
        dependenciaId: String(indicador.id_dependencia || ''),
        dependenciaFilterValue: toFilterValue(dependenciaLabel),
        dependenciaLabel,
        dependenciaTipo: normalizeDependencyType(dependencia?.tipo),
        eje,
        ejeFilterValue: toFilterValue(eje?.titulo),
        estrategia,
        estrategiaFilterValue: toFilterValue(estrategia?.titulo),
        programa,
        programaFilterValue: toFilterValue(programa?.titulo),
        proyecto,
        impacto,
        impactoFilterValue: toFilterValue(impacto?.titulo),
        objetivoDecanato,
        objetivoDecanatoLabel,
        objetivoDecanatoFilterValue: toFilterValue(objetivoDecanatoLabel),
        objetivoDependencia,
        actor,
        responsable,
        responsableDirecto,
        meta,
        avance,
        totalMeta,
        totalAvance,
        periodo,
        periodoId,
        periodoLabel,
        periodoRangeValue: toFilterValue(periodoLabel),
        esPeriodoActual,
      };
    });
  }, [
    indicadores,
    dependenciaById,
    ejes,
    estrategias,
    programas,
    proyectos,
    impactos,
    objDeca,
    objActor,
    actores,
    metas,
    avances,
    periodoById,
    currentPeriodoIds,
  ]);

  const ejeOptions = useMemo(() => {
    return buildOptions(
      indicatorRows,
      (item) => item.ejeFilterValue,
      (item) => toText(item.eje?.titulo)
    );
  }, [indicatorRows]);

  const estrategiaOptions = useMemo(() => {
    return buildOptions(
      indicatorRows,
      (item) => item.estrategiaFilterValue,
      (item) => toText(item.estrategia?.titulo)
    );
  }, [indicatorRows]);

  const programaOptions = useMemo(() => {
    return buildOptions(
      indicatorRows,
      (item) => item.programaFilterValue,
      (item) => toText(item.programa?.titulo)
    );
  }, [indicatorRows]);

  const impactoOptions = useMemo(() => {
    return buildOptions(
      indicatorRows,
      (item) => item.impactoFilterValue,
      (item) => toText(item.impacto?.titulo)
    );
  }, [indicatorRows]);

  const objetivoDecanatoOptions = useMemo(() => {
    return buildOptions(
      indicatorRows,
      (item) => item.objetivoDecanatoFilterValue,
      (item) => item.objetivoDecanatoLabel
    );
  }, [indicatorRows]);

  const dependenciaOptions = useMemo(() => {
    return buildOptions(
      indicatorRows,
      (item) => item.dependenciaFilterValue,
      (item) => item.dependenciaLabel
    );
  }, [indicatorRows]);

  const periodoOptions = useMemo(() => {
    return buildOptions(
      indicatorRows,
      (item) => item.periodoRangeValue,
      (item) => item.periodoLabel
    );
  }, [indicatorRows]);

  const filteredRows = useMemo(() => {
    return indicatorRows.filter((item) => {
      if (filters.ejeId && item.ejeFilterValue !== filters.ejeId) {
        return false;
      }

      if (filters.estrategiaId && item.estrategiaFilterValue !== filters.estrategiaId) {
        return false;
      }

      if (filters.programaId && item.programaFilterValue !== filters.programaId) {
        return false;
      }

      if (filters.impactoId && item.impactoFilterValue !== filters.impactoId) {
        return false;
      }

      if (
        filters.objetivoDecanatoId &&
        item.objetivoDecanatoFilterValue !== filters.objetivoDecanatoId
      ) {
        return false;
      }

      if (filters.dependenciaId && item.dependenciaFilterValue !== filters.dependenciaId) {
        return false;
      }

      if (
        filters.tipoDependencia !== 'TODAS' &&
        item.dependenciaTipo !== filters.tipoDependencia
      ) {
        return false;
      }

      if (filters.periodoId && item.periodoRangeValue !== filters.periodoId) {
        return false;
      }

      if (filters.periodoActual === 'SI' && !item.esPeriodoActual) {
        return false;
      }

      if (filters.periodoActual === 'NO' && item.esPeriodoActual) {
        return false;
      }

      return true;
    });
  }, [indicatorRows, filters]);

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setExpandedRowKey(null);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setExpandedRowKey(null);
  };

  const handleAccordionChange = (rowKey) => (event, isExpanded) => {
    setExpandedRowKey(isExpanded ? rowKey : null);
  };

  if (!data) {
    return (
      <Typography sx={{ marginTop: '20px' }}>
        Cargando información de indicadores...
      </Typography>
    );
  }

  if (!indicadores.length) {
    return (
      <Typography sx={{ marginTop: '20px' }}>
        No hay indicadores disponibles.
      </Typography>
    );
  }

  return (
    <Box className="indicators-page">
      <Typography variant="h5" sx={{ marginBottom: '14px', fontWeight: 700 }}>
        Indicadores
      </Typography>

      <Paper className="filters-panel" elevation={1}>
        <Box className="filters-header">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Filtros
          </Typography>
          <Button variant="outlined" size="small" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </Box>

        <Box className="filters-grid">
          <FormControl size="small" fullWidth>
            <InputLabel id="filter-eje-label">Eje</InputLabel>
            <Select
              labelId="filter-eje-label"
              value={filters.ejeId}
              label="Eje"
              onChange={handleFilterChange('ejeId')}
            >
              <MenuItem value="">Todos</MenuItem>
              {ejeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="filter-estrategia-label">Estrategia</InputLabel>
            <Select
              labelId="filter-estrategia-label"
              value={filters.estrategiaId}
              label="Estrategia"
              onChange={handleFilterChange('estrategiaId')}
            >
              <MenuItem value="">Todas</MenuItem>
              {estrategiaOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="filter-programa-label">Programa</InputLabel>
            <Select
              labelId="filter-programa-label"
              value={filters.programaId}
              label="Programa"
              onChange={handleFilterChange('programaId')}
            >
              <MenuItem value="">Todos</MenuItem>
              {programaOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="filter-impacto-label">Impacto</InputLabel>
            <Select
              labelId="filter-impacto-label"
              value={filters.impactoId}
              label="Impacto"
              onChange={handleFilterChange('impactoId')}
            >
              <MenuItem value="">Todos</MenuItem>
              {impactoOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="filter-objetivo-deca-label">Objetivo Decanato</InputLabel>
            <Select
              labelId="filter-objetivo-deca-label"
              value={filters.objetivoDecanatoId}
              label="Objetivo Decanato"
              onChange={handleFilterChange('objetivoDecanatoId')}
            >
              <MenuItem value="">Todos</MenuItem>
              {objetivoDecanatoOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="filter-dependencia-label">Dependencia</InputLabel>
            <Select
              labelId="filter-dependencia-label"
              value={filters.dependenciaId}
              label="Dependencia"
              onChange={handleFilterChange('dependenciaId')}
            >
              <MenuItem value="">Todas</MenuItem>
              {dependenciaOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="filter-periodo-label">Periodo</InputLabel>
            <Select
              labelId="filter-periodo-label"
              value={filters.periodoId}
              label="Periodo"
              onChange={handleFilterChange('periodoId')}
            >
              <MenuItem value="">Todos</MenuItem>
              {periodoOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box className="filters-secondary-row">
          <FormControl className="filter-radio-group-block">
            <Typography className="radio-group-title">Tipo de dependencia</Typography>
            <RadioGroup
              row
              value={filters.tipoDependencia}
              onChange={handleFilterChange('tipoDependencia')}
            >
              <FormControlLabel value="TODAS" control={<Radio size="small" />} label="Todas" />
              <FormControlLabel value="Oficina" control={<Radio size="small" />} label="Oficina" />
              <FormControlLabel value="Escuela" control={<Radio size="small" />} label="Escuela" />
            </RadioGroup>
          </FormControl>

          <FormControl className="filter-radio-group-block">
            <Typography className="radio-group-title">Hace parte del periodo actual</Typography>
            <RadioGroup
              row
              value={filters.periodoActual}
              onChange={handleFilterChange('periodoActual')}
            >
              <FormControlLabel value="TODOS" control={<Radio size="small" />} label="Todos" />
              <FormControlLabel value="SI" control={<Radio size="small" />} label="Sí" />
              <FormControlLabel value="NO" control={<Radio size="small" />} label="No" />
            </RadioGroup>
          </FormControl>
        </Box>

        <Typography variant="body2" className="filters-result-count">
          Mostrando {filteredRows.length} de {indicatorRows.length} indicadores
        </Typography>
      </Paper>

      <Paper className="indicator-list-header" elevation={1}>
        <Typography className="summary-title" sx={{ fontWeight: 700 }}>
          ID
        </Typography>
        <Typography className="summary-title" sx={{ fontWeight: 700 }}>
          Nombre
        </Typography>
        <Typography className="summary-title indicator-summary-dependency" sx={{ fontWeight: 700 }}>
          Dependencia
        </Typography>
      </Paper>

      {filteredRows.map((row) => {
        const {
          rowKey,
          idIndicador,
          indicador,
          dependencia,
          eje,
          estrategia,
          programa,
          proyecto,
          impacto,
          objetivoDecanato,
          objetivoDependencia,
          actor,
          responsable,
          responsableDirecto,
          meta,
          avance,
          totalMeta,
          totalAvance,
        } = row;

        const isExpanded = expandedRowKey === rowKey;

        const detailBlocks = isExpanded
          ? [
              { label: 'Eje', value: eje?.titulo },
              { label: 'Estrategia', value: estrategia?.titulo },
              { label: 'Programa', value: programa?.titulo },
              { label: 'Proyecto', value: proyecto?.titulo },
              { label: 'Impacto', value: impacto?.titulo },
              { label: 'Objetivo Decanato', value: getObjectiveDisplay(objetivoDecanato) },
              { label: 'Objetivo Oficina', value: objetivoDependencia?.objetivo_actor },
              {
                label: 'Responsable',
                value: responsable ? getDependencyDisplay(responsable) : actor?.responsable0,
              },
              {
                label: 'Responsable Directo',
                value: responsableDirecto
                  ? getDependencyDisplay(responsableDirecto)
                  : actor?.responsable_indirecto,
              },
              { label: 'Coequipero', value: actor?.coequipero },
              { label: 'Producto', value: indicador.producto },
            ]
          : [];

        return (
          <Accordion
            key={rowKey}
            className="indicator-accordion"
            expanded={isExpanded}
            onChange={handleAccordionChange(rowKey)}
            TransitionProps={{ unmountOnExit: true, timeout: 180 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box className="indicator-summary-grid">
                <Typography sx={{ fontWeight: 'bold' }}>{toText(indicador.id)}</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{toText(indicador.nombre)}</Typography>
                <Typography className="indicator-summary-dependency" sx={{ fontWeight: 'bold' }}>
                  {getDependencyDisplay(dependencia)}
                </Typography>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              {isExpanded && (
                <>
                  <Box className="indicator-detail-grid">
                    {detailBlocks.map((item) => (
                      <Paper key={`${idIndicador}-${item.label}`} className="detail-item" elevation={0}>
                        <Typography className="detail-label" sx={{ fontWeight: 'bold' }}>
                          {item.label}
                        </Typography>
                        <Typography className="detail-value">{toText(item.value)}</Typography>
                      </Paper>
                    ))}
                  </Box>

                  <TableContainer component={Paper} sx={{ marginTop: '18px' }}>
                    <Table size="small" sx={{ border: '1px solid #ddd' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Concepto</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>2024</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>2025</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>2026</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Total Trienio</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Meta</TableCell>
                          <TableCell>{toText(meta?.tipo)}</TableCell>
                          <TableCell>{toText(meta?.meta_2024)}</TableCell>
                          <TableCell>{toText(meta?.meta_2025)}</TableCell>
                          <TableCell>{toText(meta?.meta_2026)}</TableCell>
                          <TableCell>{toText(totalMeta)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Avance</TableCell>
                          <TableCell>{toText(meta?.tipo)}</TableCell>
                          <TableCell>{toText(avance?.avance2024)}</TableCell>
                          <TableCell>{toText(avance?.avance2025)}</TableCell>
                          <TableCell>{toText(avance?.avance2026)}</TableCell>
                          <TableCell>{toText(totalAvance)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 2,
                      marginTop: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <Box sx={{ width: '20%', fontWeight: 'bold' }}>Documentos de evidencia:</Box>
                    <Box sx={{ width: '10%' }} />
                    <Box sx={{ width: '16.66%', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ display: 'block', marginBottom: '4px' }}>
                        2024
                      </Typography>
                      <TextField className="input-value" label="URL documento evidencia 2024" />
                    </Box>
                    <Box sx={{ width: '16.66%', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ display: 'block', marginBottom: '4px' }}>
                        2025
                      </Typography>
                      <TextField className="input-value" label="URL documento evidencia 2025" />
                    </Box>
                    <Box sx={{ width: '16.66%', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ display: 'block', marginBottom: '4px' }}>
                        2026
                      </Typography>
                      <TextField className="input-value" label="URL documento evidencia 2026" />
                    </Box>
                    <Box sx={{ width: '16.66%' }} />
                  </Box>

                  <Box className="notes-box">
                    <Typography className="detail-label">Observaciones</Typography>
                    <Typography className="detail-value">{toText(indicador.observaciones)}</Typography>

                    <Typography className="detail-label" sx={{ marginTop: '10px' }}>
                      Necesidad Específica
                    </Typography>
                    <Typography className="detail-value">
                      {toText(indicador['necesidad_específica'] || indicador.necesidad_especifica)}
                    </Typography>
                  </Box>
                </>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {!filteredRows.length && (
        <Paper className="empty-filters-state" elevation={0}>
          <Typography>
            No se encontraron indicadores con los filtros seleccionados.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default IndicatorsPage;
