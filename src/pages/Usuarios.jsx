import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TextField,
  Typography,
} from "@mui/material";
import { createSheetRow } from "../api/api";

const toText = (value) => String(value ?? "").trim() || "No disponible";
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const sortById = (items) =>
  [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const getSheet = (data, ...keys) => {
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const isPrivilegedRole = (role) => {
  const value = normalize(role);
  return value === "administrador" || value === "sistemas";
};

function Usuarios({ data, userInfo }) {
  const [users, setUsers] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    correo: "",
    id_dependencia: "",
  });

  useEffect(() => {
    setUsers(sortById(getSheet(data, "USUARIOS")));
    setDependencies(sortById(getSheet(data, "DEPENDENCIA", "DEPENDENCIAS")));
  }, [data]);

  const role = normalize(userInfo?.rol || userInfo?.permiso);
  const canManageUsers = isPrivilegedRole(role);

  const dependencyById = useMemo(
    () => new Map(dependencies.map((item) => [String(item.id), item])),
    [dependencies],
  );

  const resetForm = () => {
    setForm({
      correo: "",
      id_dependencia: "",
    });
  };

  const handleOpen = () => {
    setError("");
    setSuccess("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError("");
    setSuccess("");
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const localPart = String(form.correo || "").trim();
      const fullEmail = `${localPart}@correounivalle.edu.co`;
      if (!localPart || !form.id_dependencia) {
        throw new Error("Completa correo y dependencia.");
      }

      const response = await createSheetRow("USUARIOS", {
        id_dependencia: String(form.id_dependencia),
        correo: fullEmail,
        rol: "usuario",
      });

      const createdId = String(
        response?.id ?? response?.data?.id ?? response?.insertId ?? "",
      );

      setUsers((prev) =>
        sortById([
          ...prev,
          {
            id: createdId || String(Date.now()),
            id_dependencia: String(form.id_dependencia),
            correo: fullEmail,
            rol: "usuario",
          },
        ]),
      );
      setSuccess("Usuario creado correctamente.");
      resetForm();
      setOpen(true);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "No se pudo crear el usuario.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (!canManageUsers) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Gestión de Usuarios
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          No tienes permisos para ver esta sección.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Gestión de Usuarios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administra los usuarios del sistema.
            </Typography>
          </Box>
          <Button variant="contained" onClick={handleOpen}>
            Crear usuario
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Correo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Dependencia</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{toText(user.id)}</TableCell>
                <TableCell>{toText(user.correo)}</TableCell>
                <TableCell>
                  {toText(dependencyById.get(String(user.id_dependencia))?.nombre)}
                </TableCell>
                <TableCell>{toText(user.rol)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Crear usuario</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2 }}>
            <TextField
              fullWidth
              label="Correo"
              helperText="@correounivalle.edu.co se agrega automáticamente"
              value={form.correo}
              onChange={handleChange("correo")}
            />
            <FormControl fullWidth>
              <InputLabel>Dependencia</InputLabel>
              <Select
                value={form.id_dependencia}
                label="Dependencia"
                onChange={handleChange("id_dependencia")}
              >
                <MenuItem value="">
                  Seleccione una dependencia
                </MenuItem>
                {dependencies.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {toText(item.nombre)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cerrar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Usuarios;
