import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
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
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { deleteDrive, updateSheetRow, uploadDrive } from "../api/api";

const YEARS = [2026, 2027, 2029, 2030];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getDriveFileId = (link) => {
  const match = String(link || "").match(/\/file\/d\/([^/]+)/);
  if (match?.[1]) return match[1];
  try {
    return new URL(link).searchParams.get("id");
  } catch {
    return null;
  }
};

const Documentos = ({ data, userInfo, onRefreshData }) => {
  const [selectedYear, setSelectedYear] = useState(YEARS[0]);
  const [uploadingId, setUploadingId] = useState(null);
  const [message, setMessage] = useState(null);

  const dependencies = useMemo(
    () => sortById(getSheet(data, "DEPENDENCIAS", "DEPENDENCIA")),
    [data],
  );
  const role = normalize(userInfo?.rol || userInfo?.permiso);
  const canUpload = role === "calidad";
  const isPrivileged =
    canUpload || role === "administrador" || role === "sistemas";
  const userDependencyId = String(userInfo?.id_dependencia || "").trim();
  const visibleDependencies = useMemo(() => {
    if (isPrivileged || !userDependencyId) return dependencies;
    return dependencies.filter(
      (dependency) => String(dependency.id) === userDependencyId,
    );
  }, [dependencies, isPrivileged, userDependencyId]);

  const handleUpload = async (dependency, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage({
        severity: "error",
        text: "Solo puedes subir archivos PDF.",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({
        severity: "error",
        text: "El archivo no puede superar 25 MB.",
      });
      return;
    }

    setUploadingId(dependency.id);
    setMessage(null);
    try {
      const currentLink = String(dependency?.[selectedYear] || "").trim();
      const fileId = currentLink ? getDriveFileId(currentLink) : undefined;
      const uploadResponse = await uploadDrive(file, fileId);
      const link = uploadResponse?.webViewLink || uploadResponse?.url;
      if (!link)
        throw new Error("El backend no devolvió el enlace del archivo.");

      await updateSheetRow("DEPENDENCIAS", dependency.id, {
        [selectedYear]: link,
      });
      await onRefreshData();
      setMessage({
        severity: "success",
        text: "Documento guardado correctamente.",
      });
    } catch (error) {
      setMessage({
        severity: "error",
        text: getErrorMessage(error, "No se pudo guardar el documento."),
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (dependency) => {
    const link = String(dependency?.[selectedYear] || "").trim();
    const fileId = getDriveFileId(link);
    if (!fileId) {
      setMessage({
        severity: "error",
        text: "No se pudo identificar el archivo de Drive.",
      });
      return;
    }
    if (
      !window.confirm(
        `Eliminar el documento ${selectedYear} de esta dependencia?`,
      )
    )
      return;

    setUploadingId(dependency.id);
    setMessage(null);
    try {
      await deleteDrive(fileId);
      await updateSheetRow("DEPENDENCIAS", dependency.id, {
        [selectedYear]: "",
      });
      await onRefreshData();
      setMessage({
        severity: "success",
        text: "Documento eliminado correctamente.",
      });
    } catch (error) {
      setMessage({
        severity: "error",
        text: getErrorMessage(error, "No se pudo eliminar el documento."),
      });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight={700}>
          Documentos por dependencia
        </Typography>
        <Select
          size="small"
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
          aria-label="Año del documento"
        >
          {YEARS.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {message && (
        <Alert severity={message.severity} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Dependencia</TableCell>
              <TableCell>Documento {selectedYear}</TableCell>
              {canUpload && <TableCell align="right">Acción</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleDependencies.map((dependency) => {
              const link = String(dependency?.[selectedYear] || "").trim();
              const isUploading = uploadingId === dependency.id;
              return (
                <TableRow key={dependency.id}>
                  <TableCell>
                    <Typography fontWeight={600}>
                      {dependency.nombre || "Sin nombre"}
                    </Typography>
                    {dependency.abreviatura && (
                      <Typography variant="body2" color="text.secondary">
                        {dependency.abreviatura}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {link ? (
                      <Link href={link} target="_blank" rel="noreferrer">
                        Ver documento
                      </Link>
                    ) : (
                      <Typography color="text.secondary">
                        Sin documento
                      </Typography>
                    )}
                  </TableCell>
                  {canUpload && (
                    <TableCell align="right">
                      <Button
                        component="label"
                        variant="contained"
                        size="small"
                        startIcon={
                          isUploading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <UploadFileIcon />
                          )
                        }
                        disabled={isUploading}
                      >
                        {isUploading
                          ? "Procesando..."
                          : link
                            ? "Editar PDF"
                            : "Subir PDF"}
                        <input
                          hidden
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={(event) => handleUpload(dependency, event)}
                        />
                      </Button>
                      {link && (
                        <Button
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => handleDelete(dependency)}
                          disabled={isUploading}
                        >
                          Eliminar
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!visibleDependencies.length && (
              <TableRow>
                <TableCell colSpan={canUpload ? 3 : 2}>
                  No hay una dependencia asociada a este usuario.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Documentos;
