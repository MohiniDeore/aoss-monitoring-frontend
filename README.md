# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


Perfect 👍
Below is a **clean, copy-paste–ready README.md** you can put **in the same repo as your React app + dashboard JSON**, explaining **exactly** how your teammate can set up **Node Exporter + Prometheus + Grafana** on **their machine / EC2** and then plug it into your UI.

This README assumes:

* React app is already pushed
* Grafana dashboard JSON is already pushed
* They will **run infra locally or on EC2**
* No Docker required (simple + beginner-safe)

---

# 🖥️ AOSS – EC2 Monitoring Setup Guide

**(Node Exporter + Prometheus + Grafana)**

This document explains how to **reproduce the monitoring stack** used by this project.

You will set up:

```
EC2 / Linux Instance
 └── node_exporter  (system metrics)
        ↓
Prometheus          (scraping + storage)
        ↓
Grafana             (dashboards)
        ↓
React UI (iframe / API integration)
```

---

## 🧩 Components Used

| Component     | Purpose                    |
| ------------- | -------------------------- |
| Node Exporter | Exposes EC2 system metrics |
| Prometheus    | Scrapes & stores metrics   |
| Grafana       | Visualizes metrics         |
| React App     | Displays dashboard         |

---

## 🔹 STEP 0 — Prerequisites

### OS

* Ubuntu 20.04 / 22.04 (EC2 or local)
* WSL2 Ubuntu also works

### Ports to allow (EC2 Security Group)

| Port         | Purpose       |
| ------------ | ------------- |
| 9100         | Node Exporter |
| 9090 or 9091 | Prometheus    |
| 3000         | Grafana       |

> ✅ **Inbound rules required** for 9100 & 3000
> Outbound is open by default

---

## 🔹 STEP 1 — Install Node Exporter (on EC2)

Run **on the EC2 instance you want to monitor**.

```bash
# Download
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz

# Extract
tar xvf node_exporter-1.7.0.linux-amd64.tar.gz

# Move binary
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Create service
sudo nano /etc/systemd/system/node_exporter.service
```

Paste:

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

Verify:

```bash
curl http://localhost:9100/metrics
```

✅ You should see a long list of metrics.

---

## 🔹 STEP 2 — Install Prometheus (Local / WSL )

Download Prometheus:

```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.49.1/prometheus-2.49.1.linux-amd64.tar.gz
tar xvf prometheus-2.49.1.linux-amd64.tar.gz
cd prometheus-2.49.1.linux-amd64
```

### Configure `prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "ec2-node"
    static_configs:
      - targets: ["<EC2_PUBLIC_IP>:9100"]
```

> Replace `<EC2_PUBLIC_IP>` with your instance IP.

---

### Start Prometheus

If port **9090 is free**:

```bash
./prometheus --config.file=prometheus.yml
```

If **9090 already in use**:

```bash
./prometheus \
  --config.file=prometheus.yml \
  --web.listen-address=":9091"
```

Open:

```
http://localhost:9090
or
http://localhost:9091
```

Check **Status → Targets**
✅ `ec2-node` should be **UP**

---

## 🔹 STEP 3 — Install Grafana

```bash
sudo apt update
sudo apt install -y grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

Open:

```
http://localhost:3000
```

Default login:

```
user: admin
pass: admin
```

---

## 🔹 STEP 4 — Add Prometheus as Data Source

Grafana → ⚙️ Settings → Data Sources → Add data source

| Field       | Value                                              |
| ----------- | -------------------------------------------------- |
| Type        | Prometheus                                         |
| URL         | `http://localhost:9090` or `http://localhost:9091` |
| Access      | Server                                             |
| Save & Test | ✅                                                  |

---

## 🔹 STEP 5 — Import Dashboard JSON (Persistent)

### Create folders

```bash
sudo mkdir -p /etc/grafana/provisioning/dashboards
sudo mkdir -p /var/lib/grafana/dashboards
sudo chown -R grafana:grafana /var/lib/grafana/dashboards
```

### Copy dashboard JSON

```bash
sudo cp aoss-ec2-dashboard.json /var/lib/grafana/dashboards/
sudo chown grafana:grafana /var/lib/grafana/dashboards/aoss-ec2-dashboard.json
sudo chmod 644 /var/lib/grafana/dashboards/aoss-ec2-dashboard.json
```

### Provisioning config

```bash
sudo nano /etc/grafana/provisioning/dashboards/aoss-dashboards.yaml
```

```yaml
apiVersion: 1
providers:
  - name: "AOSS Dashboards"
    orgId: 1
    folder: "AOSS"
    type: file
    editable: true
    options:
      path: /var/lib/grafana/dashboards
```

Restart Grafana:

```bash
sudo systemctl restart grafana-server
```

✅ Dashboard will **persist across restarts**

---

## 🔹 STEP 6 — Allow Grafana Embedding (For React)

Edit:

```bash
sudo nano /etc/grafana/grafana.ini
```

Uncomment / set:

```ini
[security]
allow_embedding = true
```

Restart:

```bash
sudo systemctl restart grafana-server
```

---

## 🔹 STEP 7 — React Integration

React app embeds Grafana using iframe:

```jsx
const GRAFANA_URL =
  "http://localhost:3000/public-dashboards/<DASHBOARD_ID>";

export default function Monitoring() {
  return (
    <iframe
      src={GRAFANA_URL}
      style={{ width: "100vw", height: "100vh", border: "none" }}
      title="EC2 Monitoring"
    />
  );
}
```

---

##  What This Setup Gives You

✔ CPU / Memory / Disk / Network
✔ Live EC2 monitoring
✔ Persistent dashboards
✔ Ready for backend Prometheus querying
✔ Expandable to multi-instance setup

---

##  Next Enhancements (Future)

* Backend API → Prometheus querying
* Server cards (multi-EC2)
* Alerting
* Agent log ingestion

