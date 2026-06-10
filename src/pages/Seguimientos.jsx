import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import "../styles/seguimientos.css";

const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toNumber = (value) => {
  const normalized = String(value ?? "")
    .replace(",", ".")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPercent = (value) => {
  const number = toNumber(value);
  if (number === null) return "No disponible";
  return `${number}%`;
};

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const buildYearKeys = (metas, avances) => {
  const keys = new Set();
  [...metas, ...avances].forEach((item) => {
    Object.keys(item || {}).forEach((key) => {
      const match = key.match(/^(meta|avance)_(\d{4})$/);
      if (match) keys.add(match[2]);
    });
  });
  return [...keys].sort((a, b) => Number(a) - Number(b));
};

const Seguimientos = ({ data }) => {
  const desafios = useMemo(() => sortById(getSheet(data, "DESAFIOS")), [data]);
  const indicators = useMemo(
    () => sortById(getSheet(data, "INDICADORES_PRODUCTO")),
    [data],
  );
  const metas = useMemo(() => sortById(getSheet(data, "METAS")), [data]);
  const avances = useMemo(() => sortById(getSheet(data, "AVANCES")), [data]);

  const desafioById = useMemo(
    () => new Map(desafios.map((item) => [String(item.id), item])),
    [desafios],
  );
  const metaByIndicatorId = useMemo(
    () =>
      new Map(metas.map((item) => [String(item.id_indicador_producto), item])),
    [metas],
  );
  const avanceByIndicatorId = useMemo(
    () => new Map(avances.map((item) => [String(item.id_indicador), item])),
    [avances],
  );

  const availableYears = useMemo(
    () => buildYearKeys(metas, avances),
    [metas, avances],
  );

  const currentYear = String(new Date().getFullYear());
  const initialYear = availableYears.includes(currentYear)
    ? currentYear
    : availableYears[0] || currentYear;
  const [selectedYear, setSelectedYear] = useState(initialYear);

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(
        availableYears.includes(currentYear) ? currentYear : availableYears[0],
      );
    }
  }, [availableYears, selectedYear, currentYear]);

  const rowsByDesafio = useMemo(() => {
    const grouped = new Map();

    indicators.forEach((indicator) => {
      const challengeId = String(indicator.id_desafio ?? "");
      const desafio = desafioById.get(challengeId);
      if (!desafio) return;

      const meta = metaByIndicatorId.get(String(indicator.id));
      const avance = avanceByIndicatorId.get(String(indicator.id));
      const metaValue = meta ? meta[`meta_${selectedYear}`] : null;
      const avanceValue = avance ? avance[`avance_${selectedYear}`] : null;
      if (metaValue == null && avanceValue == null) return;

      const existing = grouped.get(challengeId) || {
        desafio,
        indicators: [],
      };

      existing.indicators.push({
        ...indicator,
        metaValue,
        avanceValue,
      });
      grouped.set(challengeId, existing);
    });

    return [...grouped.values()].filter((group) => group.indicators.length > 0);
  }, [
    indicators,
    desafioById,
    metaByIndicatorId,
    avanceByIndicatorId,
    selectedYear,
  ]);

  const totals = useMemo(() => {
    const executed = rowsByDesafio.reduce((sum, group) => {
      return (
        sum +
        group.indicators.reduce((inner, indicator) => {
          const value = toNumber(indicator.avanceValue);
          return inner + (value ?? 0);
        }, 0)
      );
    }, 0);

    return {
      executed,
      pending: Math.max(0, 100 - executed),
    };
  }, [rowsByDesafio]);

  const challengeCounts = useMemo(
    () =>
      rowsByDesafio.map((group) => ({
        desafio: group.desafio,
        count: group.indicators.length,
      })),
    [rowsByDesafio],
  );

  if (!data) {
    return (
      <Paper className="seguimientos-empty" elevation={0}>
        <Typography>Cargando información...</Typography>
      </Paper>
    );
  }

  return (
    <Box className="seguimientos-page">
      <Paper className="seguimientos-panel" elevation={1}>
        <Box className="seguimientos-header">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Seguimientos
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {rowsByDesafio.reduce(
                (sum, group) => sum + group.indicators.length,
                0,
              )}{" "}
              indicadores con seguimiento
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear}
              label="Año"
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {(availableYears.length ? availableYears : [currentYear]).map(
                (year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Box className="seguimientos-layout">
        <TableContainer component={Paper} className="seguimientos-table-card">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Desafio</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Nombre Indicador</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta planeada</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Meta ejecutada</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Porcentaje Real</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rowsByDesafio.map((group) =>
                group.indicators.map((indicator, index) => (
                  <TableRow key={`${group.desafio.id}-${indicator.id}`}>
                    {index === 0 && (
                      <TableCell
                        rowSpan={group.indicators.length}
                        sx={{ fontWeight: 700 }}
                      >
                        {toText(group.desafio.titulo)}
                      </TableCell>
                    )}
                    <TableCell>{toText(indicator.nombre)}</TableCell>
                    <TableCell>{formatPercent(indicator.metaValue)}</TableCell>
                    <TableCell>
                      {formatPercent(indicator.avanceValue)}
                    </TableCell>
                    <TableCell>
                      {formatPercent(indicator.avanceValue)}
                    </TableCell>
                  </TableRow>
                )),
              )}
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                  Total porcentaje ejecutado
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {formatPercent(totals.executed)}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {formatPercent(totals.executed)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                  Pendiente por ejecutar
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {formatPercent(totals.pending)}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {formatPercent(totals.pending)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Paper className="seguimientos-summary" elevation={1}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Resumen
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Concepto</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Total indicadores</TableCell>
                  <TableCell>
                    {rowsByDesafio.reduce(
                      (sum, group) => sum + group.indicators.length,
                      0,
                    )}
                  </TableCell>
                </TableRow>
                {challengeCounts.map((item) => (
                  <TableRow key={item.desafio.id}>
                    <TableCell>{toText(item.desafio.titulo)}</TableCell>
                    <TableCell>{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Box className="seguimientos-chart">
          <PieChart width={300} height={300}>
            <Pie
              data={[
                { name: "Ejecutado", value: totals.executed },
                { name: "Pendiente", value: totals.pending },
              ]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label={(entry) => `${entry.name}: ${formatPercent(entry.value)}`}
            />
          </PieChart>
        </Box>
      </Box>

      {!rowsByDesafio.length && (
        <Paper className="seguimientos-empty" elevation={0}>
          <Typography>
            No se encontraron indicadores con seguimiento para el año
            seleccionado.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Seguimientos;
