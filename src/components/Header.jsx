import React from "react";
import { styled } from "@mui/material/styles";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import logo from "/src/assets/images/logounivalle.svg";

const HeaderContainer = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  height: "100px",
  position: "sticky",
  top: 0,
  marginBottom: "60px",
  zIndex: 2,
  backgroundColor: "#e3e4e5",
  boxShadow: "0px 14px 20px -17px rgba(66, 68, 90, 1)",
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "center",
    height: "auto",
  },
}));
const lastUpdateDate = new Date().toLocaleDateString("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const LastUpdate = styled("div")(({ theme }) => ({
  fontSize: "12px",
  fontWeight: 400,
  color: "#8A8A8A",
  fontFamily: "Helvetica, sans-serif",
  marginTop: "2px",
  [theme.breakpoints.down("md")]: {
    fontSize: "10px",
  },
  [theme.breakpoints.down("sm")]: {
    textAlign: "center",
    fontSize: "10px",
  },
}));

const TitleContainer = styled("div")(({ theme }) => ({
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  whiteSpace: "nowrap",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  [theme.breakpoints.down("sm")]: {
    position: "static",
    transform: "none",
    marginTop: "10px",
  },
}));

const Title = styled("div")(({ theme }) => ({
  fontWeight: 600,
  fontSize: "40px",
  color: "#423b3b",
  fontFamily: "Helvetica, sans-serif",
  [theme.breakpoints.down("sm")]: {
    fontSize: "24px",
    textAlign: "center",
    margin: "10px 0",
  },
}));

const Subtitle = styled("div")(({ theme }) => ({
  fontWeight: 400,
  fontSize: "18px",
  color: "#423b3b",
  fontFamily: "Helvetica, sans-serif",
  [theme.breakpoints.down("sm")]: {
    fontSize: "18px",
    textAlign: "center",
    margin: "4px 0",
  },
}));

const Logo = styled("div")(({ theme }) => ({
  paddingLeft: "10px",
  display: "flex",
  [theme.breakpoints.down("sm")]: {
    paddingLeft: 0,
  },
}));

const ActionContainer = styled("div")(({ theme }) => ({
  paddingRight: "16px",
  display: "flex",
  alignItems: "center",
  [theme.breakpoints.down("sm")]: {
    paddingRight: 0,
    marginBottom: "12px",
  },
}));

const Header = ({ userInfo, onLogout }) => {
  return (
    <HeaderContainer role="navegación" aria-label="Navegación Principal">
      <Logo>
        <Link
          to="/"
          alt="Logo Universidad del Valle"
          aria-label="Homepage de Sistema Siac"
        >
          <img src={logo} loading="lazy" alt="Logo Universidad del Valle" />
        </Link>
      </Logo>
      <TitleContainer>
        <Title>Planeación</Title>
        {userInfo && (
          <Subtitle>{`${userInfo.name} - ${userInfo.rol}`}</Subtitle>
        )}
        <LastUpdate>Última actualización: {lastUpdateDate}</LastUpdate>
      </TitleContainer>
      <ActionContainer>
        <Button
          variant="contained"
          onClick={onLogout}
          sx={{
            backgroundColor: "#c62828",
            color: "#ffffff",
            fontWeight: 700,
            "&:hover": {
              backgroundColor: "#b71c1c",
            },
          }}
        >
          Salir
        </Button>
      </ActionContainer>
    </HeaderContainer>
  );
};

export default Header;
