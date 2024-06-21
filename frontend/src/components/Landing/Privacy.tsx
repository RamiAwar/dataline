import Header from "../Layouts/Header";
import Footer from "./Footer";

export default function Privacy() {
  return (
    <>
      <Header />

      <div className="bg-gray-900 border-r border-white/5 h-full flex flex-col justify-between">
        <div className="relative isolate pt-12">
          <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 text-white text-md lg:text-xl font-light">
              <br></br>
              <h1 className="text-3xl font-bold">DataLine Privacy Policy</h1>
              <br></br>
              <h1>Effective Date: June 21, 2024</h1>
              <br></br>
              Welcome to DataLine ("DataLine," "we," "us," and/or "our"). This
              Privacy Policy provides information about how we handle personal
              data in connection with the use of our software and services,
              which are designed for local use on your device or for
              self-hosting to connect to databases and perform queries and
              generate charts using auto-generated SQL.
              <br></br>
              Data Controller: DataLine is responsible for the processing of
              your personal data as described in this Privacy Policy.
              <br></br>
              <br></br>
              <h1 className="text-2xl font-bold">Information We Collect:</h1>
              <br></br>
              <strong className="font-bold">Voluntarily Provided:</strong> We
              collect information that you voluntarily provide, such as your
              contact information when you request support or information.
              <br></br>
              <br></br>
              <strong className="font-bold">Error Reporting:</strong> If
              enabled, we collect error information through Sentry to improve
              our application. This may include details about the error
              encountered and data relevant to the error context.
              <br></br>
              <br></br>
              <strong className="font-bold">Usage Information:</strong> We use
              the structure of your connected databases (e.g., table names,
              column names) to generate SQL queries and charts. This data is
              processed locally on your device, and we do not have access to or
              store this data.
              <br></br>
              <br></br>
              <strong className="text-2xl font-bold">
                How We Use Your Information:
              </strong>
              <br></br>
              To provide and maintain the functionality of our Services. To
              respond to support and information requests. To improve and
              personalize your experience with our Services through error
              analysis (only if error reporting is enabled). To generate SQL
              queries and visualizations directly on your device, ensuring that
              your data remains private and secure.
              <br></br>
              <br></br>
              <h1 className="text-2xl font-bold">
                Data Sharing and Disclosure:
              </h1>
              <br></br>
              <strong className="font-bold">Service Providers:</strong> Only
              after users have consented, we may share information with service
              providers like Sentry only to the extent necessary for error
              reporting and resolution. This helps us improve our support and
              services. If users configure a third-party integration (e.g.
              LangSmith tracing), we may also share information with those
              services.
              <br></br>
              <br></br>
              <strong className="font-bold">Legal Requirements:</strong> We may
              disclose your stored information if required by law or if
              necessary to protect our rights or the rights of others. Very
              little information is stored however, given the fact that DataLine
              is self-hosted and no data is stored on servers.
              <br></br>
              <br></br>
              <strong className="font-bold">Data Security:</strong> We employ
              industry-standard security measures designed to protect the
              information collected. However, please be aware that no security
              measures are perfect or impenetrable. Very little information is
              stored however, given the fact that DataLine is self-hosted and no
              data is stored on servers.
              <br></br> <br></br>
              <strong className="font-bold">Your Rights:</strong> You have
              rights regarding the access, correction, and deletion of your
              personal data. You can manage your information through the
              settings of our application and can contact us for further
              requests.
              <br></br>
              <br></br>
              <strong className="font-bold">Changes to This Policy:</strong> We
              may update this Privacy Policy from time to time, and will send
              updates to subscribers to our email list. We encourage you to
              review it regularly to stay informed about how we are protecting
              your information.
              <br></br>
              Contact Us: If you have questions about this Privacy Policy or our
              data practices, please contact us at support@dataline.app.
            </div>
          </div>
        </div>
        <Footer></Footer>
      </div>
    </>
  );
}
