import "./monitoring.css";

const GRAFANAURL =
  "http://localhost:3000/public-dashboards/282ec3e5b5dd49cdb933ebfc517487d5";

export default function Monitoring() {
  return (
    <div className="monitoring-root">
      <iframe
        src={GRAFANAURL}
        className="monitoring-iframe"
        title="EC2 Monitoring"
      />
    </div>
  );
}
