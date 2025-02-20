package com.videocall.service;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.CascadeClassifier;
import org.springframework.stereotype.Service;
import javax.annotation.PostConstruct;
import java.util.Base64;

@Service
public class EyeCorrectionService {
    private CascadeClassifier eyeDetector;
    private CascadeClassifier faceDetector;

    @PostConstruct
    public void init() {
        System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
        eyeDetector = new CascadeClassifier();
        faceDetector = new CascadeClassifier();
        eyeDetector.load("haarcascade_eye.xml");
        faceDetector.load("haarcascade_frontalface_default.xml");
    }

    public String processVideoFrame(String base64Image) {
        try {
            // Decode base64 to image
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);
            Mat frame = Imgcodecs.imdecode(new MatOfByte(imageBytes), Imgcodecs.IMREAD_COLOR);

            // Detect faces first
            MatOfRect faces = new MatOfRect();
            faceDetector.detectMultiScale(frame, faces);

            for (Rect face : faces.toArray()) {
                // Create ROI for face
                Mat faceROI = new Mat(frame, face);

                // Detect eyes in face region
                MatOfRect eyes = new MatOfRect();
                eyeDetector.detectMultiScale(faceROI, eyes);

                for (Rect eye : eyes.toArray()) {
                    // Get eye region
                    Point center = new Point(face.x + eye.x + eye.width/2, face.y + eye.y + eye.height/2);

                    // Draw eye position marker
                    Imgproc.circle(frame, center, 2, new Scalar(255, 0, 0), 2);

                    // Calculate gaze direction based on eye position
                    Mat eyeROI = new Mat(faceROI, eye);
                    Size size = eyeROI.size();
                    Mat blurred = new Mat();
                    Imgproc.GaussianBlur(eyeROI, blurred, new Size(3,3), 0);

                    // Find darkest point (pupil)
                    Core.MinMaxLocResult minMaxLoc = Core.minMaxLoc(blurred);
                    Point pupil = minMaxLoc.minLoc;

                    // Draw corrected gaze
                    Point correctedGaze = new Point(
                        face.x + eye.x + pupil.x,
                        face.y + eye.y + pupil.y
                    );
                    Imgproc.line(frame, center, correctedGaze, new Scalar(0, 255, 0), 2);
                }
            }

            // Encode back to base64
            MatOfByte buffer = new MatOfByte();
            Imgcodecs.imencode(".jpg", frame, buffer);
            return Base64.getEncoder().encodeToString(buffer.toArray());
        } catch (Exception e) {
            e.printStackTrace();
            return base64Image;
        }
    }
}